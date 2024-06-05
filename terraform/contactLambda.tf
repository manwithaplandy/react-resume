resource "aws_sns_topic" "website-contact-us" {
  name = "website-contact-us"
}

resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.website-contact-us.arn
  protocol  = "email"
  endpoint  = var.email_address
}

resource "aws_lambda_function" "form_submission" {
  function_name = "formSubmission"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.10"
  role          = aws_iam_role.lambda_exec.arn

  filename = "lambda_function.zip"

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.website-contact-us.arn
    }
  }
}

data "archive_file" "sns_publish_lambda_function" {
  type        = "zip"
  source_file = "../sns_publish_lambda/lambda_function.py"
  output_path = "lambda_function.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec"

  assume_role_policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Effect": "Allow",
            "Sid": ""
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "lambda_exec_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_sns_publish" {
  name        = "lambda_sns_publish"
  description = "Allows Lambda function to publish to SNS topic"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "sns:Publish"
            ],
            "Effect": "Allow",
            "Resource": "${aws_sns_topic.website-contact-us.arn}"
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "lambda_sns_publish_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_sns_publish.arn
}

resource "aws_api_gateway_rest_api" "api" {
  name        = "FormSubmissionAPI"
  description = "API for contact us form submission"
}

resource "aws_api_gateway_resource" "contact" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "contact"
}

resource "aws_api_gateway_method" "post_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.contact.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "post_200" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.post_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true,
  }
}

resource "aws_api_gateway_integration" "integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.post_method.http_method

  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.form_submission.invoke_arn
}

resource "aws_api_gateway_integration_response" "post_200" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.post_method.http_method
  status_code = aws_api_gateway_method_response.post_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'",
  }
}

resource "aws_api_gateway_method" "options_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.contact.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "http_200_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Origin"  = true,
  }
}

resource "aws_api_gateway_integration_response" "http_200_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = aws_api_gateway_method_response.http_200_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'",
    "method.response.header.Access-Control-Allow-Origin"  = "'*'",
  }
}

resource "aws_api_gateway_resource" "healthcheck" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "healthcheck"
}

resource "aws_api_gateway_method" "healthcheck_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.healthcheck.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "healthcheck_200" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.healthcheck.id
  http_method = aws_api_gateway_method.healthcheck_get.http_method
  status_code = "200"
}

resource "aws_api_gateway_integration" "healthcheck" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.healthcheck.id
  http_method = aws_api_gateway_method.healthcheck_get.http_method

  type                    = "MOCK"
}

resource "aws_api_gateway_integration_response" "healthcheck_200" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.healthcheck.id
  http_method = aws_api_gateway_method.healthcheck_get.http_method
  status_code = aws_api_gateway_method_response.healthcheck_200.status_code
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.form_submission.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}
