terraform {
  backend "s3" {
    bucket         = "terraform-backend-bucket-blindly-joint-moth"
    key            = "terraform.tfstate"
    region         = "us-west-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

# Provider configuration
provider "aws" {
  region = "us-west-1"
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

data "aws_acm_certificate" "amazon_issued" {
  provider    = aws.us_east_1
  domain      = "andrewmalvani.com"
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}

resource "random_pet" "bucket_name" {
  length    = 3
  separator = "-"
}


locals {
  # Define MIME types for common file extensions
  mime_types = {
    ".html"        = "text/html"
    ".css"         = "text/css"
    ".js"          = "application/javascript"
    ".json"        = "application/json"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".gif"         = "image/gif"
    ".ico"         = "image/x-icon"
    ".svg"         = "image/svg+xml"
    ".txt"         = "text/plain"
    ".webmanifest" = "application/json"
    ".webp"        = "image/webp"
  }
  build_trigger = sha1(join("", [for f in fileset("${path.module}/src", "**") : filesha1("${path.module}/src/${f}")]))
}

resource "null_resource" "npm_build" {
  triggers = {
    build_trigger = local.build_trigger
  }

  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "./"
  }
}

# S3 bucket for static website hosting
resource "aws_s3_bucket" "website" {
  bucket = "${random_pet.bucket_name.id}-website-bucket"

  # TODO: Replace deprecated configs
  logging {
    target_bucket = aws_s3_bucket.log_bucket.id
    target_prefix = "website-log/"
  }

  versioning {
    enabled = true
  }
}

# resource "aws_s3_bucket_website_configuration" "website" {
#   bucket = aws_s3_bucket.website.id

#   index_document {
#     suffix = "index.html"
#   }

#   error_document {
#     key = "error.html"
#   }
# }

resource "aws_s3_bucket_policy" "allow_cloudfront_access" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = { "AWS" : "${aws_cloudfront_origin_access_identity.oai.iam_arn}" }
        Action    = ["s3:GetObject"]
        Resource  = [
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}/*"
          ]
      },
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly",
        Effect = "Allow",
        Principal = {
          Service = "cloudfront.amazonaws.com"
        },
        Action   = "s3:GetObject",
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}/*"
        ],
        # Condition = {
        #   StringEquals = {
        #     "aws:SourceArn" = "${aws_cloudfront_distribution.website_distribution.arn}"
        #   }
        # }
      },
    ]
  })
}

resource "aws_s3_bucket_cors_configuration" "example" {
  bucket = aws_s3_bucket.website.id

  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
  }
}

# Upload React/Next.js build files to the S3 bucket
resource "aws_s3_object" "website_files" {
  for_each = fileset("${path.module}/out/", "**")

  bucket = aws_s3_bucket.website.id
  key    = each.value
  source = "${path.module}/out/${each.value}"
  etag   = filemd5("${path.module}/out/${each.value}")
  # Attempt to map the mime type explicitly using local.mime_type, but default to null if match can't be made
  content_type = try(lookup(local.mime_types, regex("\\.[^.]+$", each.value), null), null)


  depends_on = [null_resource.npm_build]
}

# S3 bucket for storing access logs
resource "aws_s3_bucket" "log_bucket" {
  bucket = "${random_pet.bucket_name.id}-log-bucket"

  # TODO: Replace deprecated configs
  logging {
    target_bucket = "${random_pet.bucket_name.id}-log-bucket"
    target_prefix = "this-bucket-log/"
  }

  versioning {
    enabled = true
  }
}

resource "aws_s3_bucket_ownership_controls" "example" {
  bucket = aws_s3_bucket.log_bucket.id

  rule {
    object_ownership = "ObjectWriter"
  }
}

# Bucket policy to allow Cloudwatch Logs to be put into the bucket
resource "aws_s3_bucket_policy" "allow_cloudfront_logs" {
  bucket = aws_s3_bucket.log_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "s3:PutObject"
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.log_bucket.arn}/*"
        Principal = { "Service" : "delivery.logs.amazonaws.com" }
      },
      {
        Action    = "s3:PutObject"
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.log_bucket.arn}/*"
        Principal = { "Service" : "logging.s3.amazonaws.com" }
        Condition = {
          "StringEquals": {
            "aws:SourceAccount": "${data.aws_caller_identity.current.account_id}"
          }
        }
      },
      {
        Action    = "s3:GetBucketAcl"
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.log_bucket.arn}"
        Principal = { "Service" : "delivery.logs.amazonaws.com" }
      }
    ]
  })
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for accessing S3 bucket from CloudFront"
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "oac"
  description                       = "Origin Access Control for resume website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution for HTTPS
resource "aws_cloudfront_distribution" "website_distribution" {
  depends_on = [aws_s3_bucket_policy.allow_cloudfront_logs]
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.website.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id

    # custom_origin_config {
    #   http_port                = 80
    #   https_port               = 443
    #   origin_protocol_policy   = "http-only"
    #   origin_ssl_protocols     = ["TLSv1.2"]
    #   origin_keepalive_timeout = 5
    # }
  }

  aliases = ["andrewmalvani.com"]

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.id}"
    cache_policy_id  = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = data.aws_acm_certificate.amazon_issued.arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # TODO: Get this working
    logging_config {
      include_cookies = false
      bucket          = "${aws_s3_bucket.log_bucket.bucket_domain_name}"
      prefix          = "cloudfront-logs/"
    }

  web_acl_id = aws_wafv2_web_acl.website_waf.arn
}

resource "aws_wafv2_web_acl" "website_waf" {
  provider    = aws.us_east_1
  name        = "${random_pet.bucket_name.id}-website-waf"
  scope       = "CLOUDFRONT"
  description = "A Web ACL to protect the website"
  default_action {
    allow {}
  }

  rule {
    name     = "SQLInjectionRule"
    priority = 1
    action {
      block {}
    }
    statement {
      sqli_match_statement {
        field_to_match {
          query_string {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjection"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "XSSMatchRule"
    priority = 2
    action {
      block {}
    }
    statement {
      xss_match_statement {
        field_to_match {
          query_string {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "XSSMatch"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "HTTPMethodRule"
    priority = 3
    action {
      block {}
    }
    statement {
      or_statement {
        statement {
          byte_match_statement {
            field_to_match {
              method {}
            }
            positional_constraint = "EXACTLY"
            search_string         = "PUT"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
        statement {
          byte_match_statement {
            field_to_match {
              method {}
            }
            positional_constraint = "EXACTLY"
            search_string         = "DELETE"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
        statement {
          byte_match_statement {
            field_to_match {
              method {}
            }
            positional_constraint = "EXACTLY"
            search_string         = "CONNECT"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "HTTPMethod"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitRule"
    priority = 4
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WebsiteWAF"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl" "sql_injection_rule" {
  name        = "${random_pet.bucket_name.id}-sql-injection-rule"
  scope       = "REGIONAL"
  description = "SQL Injection Rule"

  default_action {
    allow {}
  }

  rule {
    name     = "SQLInjectionRule"
    priority = 1

    action {
      block {}
    }

    statement {
      sqli_match_statement {
        field_to_match {
          query_string {}
        }

        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjectionRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "SQLInjectionRuleWebACL"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl" "xss_rule" {
  name        = "${random_pet.bucket_name.id}-xss-rule"
  scope       = "REGIONAL"
  description = "XSS protection rule"

  default_action {
    allow {}
  }

  rule {
    name     = "XSSMatchRule"
    priority = 1

    action {
      block {}
    }

    statement {
      xss_match_statement {
        field_to_match {
          query_string {}
        }

        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "XSSMatchRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "XSSRuleWebACL"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl" "http_method_rule" {
  name        = "${random_pet.bucket_name.id}-http-method-rule"
  scope       = "REGIONAL"
  description = "HTTP Method Rule"

  default_action {
    allow {}
  }

  rule {
    name     = "HTTPMethodRule"
    priority = 1

    action {
      block {}
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            field_to_match {
              method {}
            }
            positional_constraint = "EXACTLY"
            search_string         = "PUT"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }

        statement {
          byte_match_statement {
            field_to_match {
              method {}
            }
            positional_constraint = "EXACTLY"
            search_string         = "DELETE"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }

        statement {
          byte_match_statement {
            field_to_match {
              method {}
            }
            positional_constraint = "EXACTLY"
            search_string         = "CONNECT"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "HTTPMethodRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "HTTPMethodRuleWebACL"
    sampled_requests_enabled   = true
  }
}

# Rate limiting rule
resource "aws_wafv2_web_acl" "rate_based_rule" {
  name        = "${random_pet.bucket_name.id}-rate-limit-waf-acl"
  description = "WAF ACL for rate limiting by IP"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "rate-limit-rule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ExampleWebACL"
    sampled_requests_enabled   = true
  }
}


# DynamoDB table for data storage
resource "aws_dynamodb_table" "data_table" {
  name         = "${random_pet.bucket_name.id}-data-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# SNS topic for "Contact Us" submissions
resource "aws_sns_topic" "contact_us_topic" {
  name = "${random_pet.bucket_name.id}-contact-us-topic"
}

# IAM role for Lambda function
# resource "aws_iam_role" "lambda_role" {
#   name = "${random_pet.bucket_name.id}-lambda-role"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "lambda.amazonaws.com"
#         }
#       }
#     ]
#   })
# }

# # IAM policy for Lambda function
# resource "aws_iam_role_policy_attachment" "lambda_policy" {
#   policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
#   role       = aws_iam_role.lambda_role.name
# }

# # Lambda function for handling "Contact Us" submissions
# resource "aws_lambda_function" "contact_us_lambda" {
#   filename      = "lambda_function.zip"
#   function_name = "contact-us-lambda"
#   role          = aws_iam_role.lambda_role.arn
#   handler       = "index.handler"
#   runtime       = "nodejs20.x"

#   environment {
#     variables = {
#       SNS_TOPIC_ARN = aws_sns_topic.contact_us_topic.arn
#     }
#   }
# }

# # Lambda permission to allow SNS to invoke the function
# resource "aws_lambda_permission" "sns_lambda_permission" {
#   statement_id  = "AllowSNSInvoke"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.contact_us_lambda.function_name
#   principal     = "sns.amazonaws.com"
#   source_arn    = aws_sns_topic.contact_us_topic.arn
# }

# # SNS topic subscription for Lambda function
# resource "aws_sns_topic_subscription" "lambda_subscription" {
#   topic_arn = aws_sns_topic.contact_us_topic.arn
#   protocol  = "lambda"
#   endpoint  = aws_lambda_function.contact_us_lambda.arn
# }

output "cloudfront_distribution_url" {
  value       = "https://${aws_cloudfront_distribution.website_distribution.domain_name}/"
  description = "The URL to access the webpage served through CloudFront"
}