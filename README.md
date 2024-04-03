# Resume Website Project

This project hosts an interactive resume website built with React and hosted on AWS. The infrastructure is provisioned and managed using Terraform, ensuring a scalable, efficient, and version-controlled deployment process.

## Features

- **React Frontend**: A modern, fast, and responsive web frontend using React and Next.js.
- **AWS Hosting**: The website is hosted on AWS, leveraging services such as Amazon S3 for hosting static assets, and Amazon CloudFront for a global Content Delivery Network (CDN).
- **Terraform Infrastructure**: Infrastructure as Code (IaC) practices with Terraform to automate the setup, scalability, and maintenance of the AWS resources.
- **Responsive Design**: Designed to work on desktops, tablets, and mobile devices.

## Prerequisites

To deploy this project, you will need:

- An AWS account
- Terraform installed on your system
- Node.js and npm (Node Package Manager)
- A preferred IDE or text editor

## AWS Services used

- AWS S3: For hosting static assets.
- AWS CloudFront: To provide a fast global content delivery network (CDN).
- AWS WAF: To track & prevent malicious traffic (disabled because it's not free)
- DynamoDB: To track user metrics for user statistics page (not implemented yet)
- AWS Lambda: Triggered by the Contact section, sends request to SNS (not implemented yet)
- SNS: To deliver emails from the Contact section (not implemented yet)

## Contributing

Contributions are welcome! If you have improvements or bug fixes, please open a pull request with your changes.

## License

Specify your project's license here, providing details on how others can use and contribute to your project.
