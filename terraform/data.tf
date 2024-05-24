data "aws_caller_identity" "current" {}

data "aws_acm_certificate" "amazon_issued" {
  provider    = aws.us_east_1
  domain      = "andrewmalvani.com"
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}
