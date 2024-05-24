# resource "aws_wafv2_web_acl" "website_waf" {
#   provider    = aws.us_east_1
#   name        = "${random_pet.bucket_name.id}-website-waf"
#   scope       = "CLOUDFRONT"
#   description = "A Web ACL to protect the website"
#   default_action {
#     allow {}
#   }

#   rule {
#     name     = "SQLInjectionRule"
#     priority = 1
#     action {
#       block {}
#     }
#     statement {
#       sqli_match_statement {
#         field_to_match {
#           query_string {}
#         }
#         text_transformation {
#           priority = 0
#           type     = "URL_DECODE"
#         }
#       }
#     }
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "SQLInjection"
#       sampled_requests_enabled   = true
#     }
#   }

#   rule {
#     name     = "XSSMatchRule"
#     priority = 2
#     action {
#       block {}
#     }
#     statement {
#       xss_match_statement {
#         field_to_match {
#           query_string {}
#         }
#         text_transformation {
#           priority = 0
#           type     = "URL_DECODE"
#         }
#       }
#     }
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "XSSMatch"
#       sampled_requests_enabled   = true
#     }
#   }

#   rule {
#     name     = "HTTPMethodRule"
#     priority = 3
#     action {
#       block {}
#     }
#     statement {
#       or_statement {
#         statement {
#           byte_match_statement {
#             field_to_match {
#               method {}
#             }
#             positional_constraint = "EXACTLY"
#             search_string         = "PUT"
#             text_transformation {
#               priority = 0
#               type     = "LOWERCASE"
#             }
#           }
#         }
#         statement {
#           byte_match_statement {
#             field_to_match {
#               method {}
#             }
#             positional_constraint = "EXACTLY"
#             search_string         = "DELETE"
#             text_transformation {
#               priority = 0
#               type     = "LOWERCASE"
#             }
#           }
#         }
#         statement {
#           byte_match_statement {
#             field_to_match {
#               method {}
#             }
#             positional_constraint = "EXACTLY"
#             search_string         = "CONNECT"
#             text_transformation {
#               priority = 0
#               type     = "LOWERCASE"
#             }
#           }
#         }
#       }
#     }
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "HTTPMethod"
#       sampled_requests_enabled   = true
#     }
#   }

#   rule {
#     name     = "RateLimitRule"
#     priority = 4
#     action {
#       block {}
#     }
#     statement {
#       rate_based_statement {
#         limit              = 1000
#         aggregate_key_type = "IP"
#       }
#     }
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "RateLimit"
#       sampled_requests_enabled   = true
#     }
#   }

#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name                = "WebsiteWAF"
#     sampled_requests_enabled   = true
#   }
# }

# resource "aws_wafv2_web_acl" "sql_injection_rule" {
#   provider    = aws.us_east_1
#   name        = "${random_pet.bucket_name.id}-sql-injection-rule"
#   scope       = "REGIONAL"
#   description = "SQL Injection Rule"

#   default_action {
#     allow {}
#   }

#   rule {
#     name     = "SQLInjectionRule"
#     priority = 1

#     action {
#       block {}
#     }

#     statement {
#       sqli_match_statement {
#         field_to_match {
#           query_string {}
#         }

#         text_transformation {
#           priority = 0
#           type     = "URL_DECODE"
#         }
#       }
#     }

#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "SQLInjectionRule"
#       sampled_requests_enabled   = true
#     }
#   }

#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name                = "SQLInjectionRuleWebACL"
#     sampled_requests_enabled   = true
#   }
# }

# resource "aws_wafv2_web_acl" "xss_rule" {
#   provider    = aws.us_east_1
#   name        = "${random_pet.bucket_name.id}-xss-rule"
#   scope       = "REGIONAL"
#   description = "XSS protection rule"

#   default_action {
#     allow {}
#   }

#   rule {
#     name     = "XSSMatchRule"
#     priority = 1

#     action {
#       block {}
#     }

#     statement {
#       xss_match_statement {
#         field_to_match {
#           query_string {}
#         }

#         text_transformation {
#           priority = 0
#           type     = "URL_DECODE"
#         }
#       }
#     }

#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "XSSMatchRule"
#       sampled_requests_enabled   = true
#     }
#   }

#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name                = "XSSRuleWebACL"
#     sampled_requests_enabled   = true
#   }
# }

# resource "aws_wafv2_web_acl" "http_method_rule" {
#   provider    = aws.us_east_1
#   name        = "${random_pet.bucket_name.id}-http-method-rule"
#   scope       = "REGIONAL"
#   description = "HTTP Method Rule"

#   default_action {
#     allow {}
#   }

#   rule {
#     name     = "HTTPMethodRule"
#     priority = 1

#     action {
#       block {}
#     }

#     statement {
#       or_statement {
#         statement {
#           byte_match_statement {
#             field_to_match {
#               method {}
#             }
#             positional_constraint = "EXACTLY"
#             search_string         = "PUT"
#             text_transformation {
#               priority = 0
#               type     = "LOWERCASE"
#             }
#           }
#         }

#         statement {
#           byte_match_statement {
#             field_to_match {
#               method {}
#             }
#             positional_constraint = "EXACTLY"
#             search_string         = "DELETE"
#             text_transformation {
#               priority = 0
#               type     = "LOWERCASE"
#             }
#           }
#         }

#         statement {
#           byte_match_statement {
#             field_to_match {
#               method {}
#             }
#             positional_constraint = "EXACTLY"
#             search_string         = "CONNECT"
#             text_transformation {
#               priority = 0
#               type     = "LOWERCASE"
#             }
#           }
#         }
#       }
#     }

#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "HTTPMethodRule"
#       sampled_requests_enabled   = true
#     }
#   }

#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name                = "HTTPMethodRuleWebACL"
#     sampled_requests_enabled   = true
#   }
# }

# # Rate limiting rule
# resource "aws_wafv2_web_acl" "rate_based_rule" {
#   provider    = aws.us_east_1
#   name        = "${random_pet.bucket_name.id}-rate-limit-waf-acl"
#   description = "WAF ACL for rate limiting by IP"
#   scope       = "REGIONAL"

#   default_action {
#     allow {}
#   }

#   rule {
#     name     = "rate-limit-rule"
#     priority = 1

#     action {
#       block {}
#     }

#     statement {
#       rate_based_statement {
#         limit              = 1000
#         aggregate_key_type = "IP"
#       }
#     }

#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "RateLimitRule"
#       sampled_requests_enabled   = true
#     }
#   }

#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name                = "ExampleWebACL"
#     sampled_requests_enabled   = true
#   }
# }