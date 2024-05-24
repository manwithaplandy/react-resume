output "cloudfront_distribution_url" {
  value       = "https://${aws_cloudfront_distribution.website_distribution.domain_name}/"
  description = "The URL to access the webpage served through CloudFront"
}