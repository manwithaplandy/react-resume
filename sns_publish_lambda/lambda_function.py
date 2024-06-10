import os
import boto3
import json

def lambda_handler(event, context):
    sns = boto3.client('sns')

    topic_arn = os.environ['SNS_TOPIC_ARN']

    email_body = ""
    eventbody = json.loads(event['body'])

    # Debug prints
    print(f"Event body: {event['body']}")
    print(f"Event body type: {type(event['body'])}")
    print(f"Event body parsed: {eventbody}")
    print(f"Event body parsed type: {type(eventbody)}")

    try:
        email_body = f"""
        Name: {eventbody['name']}

        Email: {eventbody['email']}

        Message: {eventbody['message']}
        """
    except KeyError as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            "body": "Missing required fields name, email, or message"
        }

    print(email_body)

    # Static values
    subject = "New contact request from andrewmalvani.com"

    sns.publish(
        TopicArn=topic_arn,
        Message=str(email_body),
        Subject=subject
    )

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": "Message sent to SNS topic"
    }
