"""Synthetic low-level services. Importing the handler never discovers credentials."""
import importlib
import io
import json
import os
from copy import deepcopy
from unittest.mock import patch

DUMMY_ENV = {
    'AWS_ACCESS_KEY_ID': 'testing', 'AWS_SECRET_ACCESS_KEY': 'testing',
    'AWS_DEFAULT_REGION': 'us-west-1', 'AWS_EC2_METADATA_DISABLED': 'true',
    'AWS_CONFIG_FILE': os.devnull, 'AWS_SHARED_CREDENTIALS_FILE': os.devnull,
    'TABLE_NAME': 'test-stats', 'LOG_BUCKET': 'test-logs', 'WEBSITE_BUCKET': 'test-site',
}


def load_handler():
    with patch.dict(os.environ, DUMMY_ENV, clear=True), patch('boto3.client', return_value=object()):
        return importlib.import_module('stats_aggregator.lambda_function')


def count_item(key, count):
    return {'id': {'S': key}, 'count': {'N': str(count)}}


def cf_item(day, uniques=1, countries=None):
    return {'id': {'S': f'cf#daily#{day}'}, 'uniques': {'N': str(uniques)},
            'countries': {'S': json.dumps(countries or {})}}


class FakeDynamoDB:
    def __init__(self, items=()):
        self.items = {item['id']['S']: deepcopy(item) for item in items}

    def get_item(self, *, Key, **kwargs):
        item = self.items.get(Key['id']['S'])
        return {'Item': deepcopy(item)} if item else {}

    def put_item(self, *, Item, **kwargs):
        self.items[Item['id']['S']] = deepcopy(Item)

    def get_paginator(self, operation):
        assert operation == 'scan'
        return self

    def paginate(self, **kwargs):
        yield {'Items': deepcopy(list(self.items.values()))}


class FakeS3:
    def __init__(self):
        self.published = []

    def get_paginator(self, operation):
        assert operation == 'list_objects_v2'
        return self

    def paginate(self, **kwargs):
        yield {'Contents': []}

    def put_object(self, **kwargs):
        self.published.append(json.loads(kwargs['Body']))


class FakeSSM:
    def get_parameter(self, **kwargs):
        return {'Parameter': {'Value': 'synthetic-token'}}


class Response(io.BytesIO):
    def __init__(self, payload):
        super().__init__(json.dumps(payload).encode())


def api_result(groups):
    return {'data': {'viewer': {'zones': [{'httpRequests1dGroups': groups}]}}}


def api_day(day, uniques=1, requests=5):
    return {'dimensions': {'date': day}, 'uniq': {'uniques': uniques},
            'sum': {'countryMap': [{'clientCountryName': 'US', 'requests': requests}]}}
