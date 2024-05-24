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