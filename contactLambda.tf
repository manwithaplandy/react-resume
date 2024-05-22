resource "aws_sns_topic" "email_alerts" {
    name = "email-alerts"
}

resource "aws_sns_topic_subscription" "email_subscription" {
    topic_arn = aws_sns_topic.email_alerts.arn
    protocol  = "email"
    endpoint  = var.email_address
}

resource "aws_lambda_function" "form_submission" {
    function_name = "formSubmission"
    handler       = "index.handler"
    runtime       = "nodejs22.x"
    role          = aws_iam_role.lambda_exec.arn

    filename = "path-to-your-lambda-function-package.zip"

    environment {
        variables = {
            SNS_TOPIC_ARN = aws_sns_topic.email_alerts.arn
        }
    }
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
            "Resource": "${aws_sns_topic.email_alerts.arn}"
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
    description = "API for form submission"
}

resource "aws_api_gateway_resource" "resource" {
    rest_api_id = aws_api_gateway_rest_api.api.id
    parent_id   = aws_api_gateway_rest_api.api.root_resource_id
    path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "method" {
    rest_api_id   = aws_api_gateway_rest_api.api.id
    resource_id   = aws_api_gateway_resource.resource.id
    http_method   = "POST"
    authorization = "NONE"
}

resource "aws_api_gateway_integration" "integration" {
    rest_api_id = aws_api_gateway_rest_api.api.id
    resource_id = aws_api_gateway_resource.resource.id
    http_method = aws_api_gateway_method.method.http_method

    integration_http_method = "POST"
    type                    = "AWS_PROXY"
    uri                     = aws_lambda_function.form_submission.invoke_arn
}

resource "aws_lambda_permission" "apigw" {
    statement_id  = "AllowExecutionFromAPIGateway"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.form_submission.function_name
    principal     = "apigateway.amazonaws.com"

    source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}