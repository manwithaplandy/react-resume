import os
import boto3

def lambda_handler(event, context):
    # Create an SNS client
    sns = boto3.client('sns')

    # Get the SNS Topic ARN from environment variable
    topic_arn = os.environ['SNS_TOPIC_ARN']

    # Publish a simple message to the specified SNS topic
    response = sns.publish(
        TopicArn=topic_arn,
        Message=str(event),    # event is converted to string to be sent as a message
    )

    # Print out the response
    print(response)

    return event