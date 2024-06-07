import os
import boto3

def lambda_handler(event, context):
    sns = boto3.client('sns')

    topic_arn = os.environ['SNS_TOPIC_ARN']

    response = sns.publish(
        TopicArn=topic_arn,
        Message=str(event['body'])
    )

    print(response)

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": "Message sent to SNS topic"
    }
