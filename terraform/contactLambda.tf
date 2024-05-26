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

resource "aws_apigatewayv2_api" "api" {
  name          = "FormSubmissionAPI"
  protocol_type = "HTTP"
  description   = "API for contact us form submission"
  cors_configuration {
    allow_origins = ["https://andrewmalvani.com"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["*"]

  }
}

resource "aws_apigatewayv2_route" "route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.integration.id}"
}

resource "aws_apigatewayv2_integration" "integration" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"

  connection_type        = "INTERNET"
  description            = "Lambda integration"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.form_submission.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.form_submission.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}