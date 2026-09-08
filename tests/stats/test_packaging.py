"""Inspect deployment archives and import their actual extracted entrypoint."""
from pathlib import Path
import os
import re
import subprocess
import sys
import tempfile
import unittest
import zipfile

from fakes import DUMMY_ENV

ROOT = Path(__file__).resolve().parents[2]


class PackagingTests(unittest.TestCase):
    def check_archive(self, archive):
        with tempfile.TemporaryDirectory() as extracted, zipfile.ZipFile(archive) as package:
            self.assertEqual(sorted(package.namelist()), ['lambda_function.py', 'ledger.py', 'payload.py'])
            package.extractall(extracted)
            script = ('import sys; from unittest.mock import patch; sys.path.insert(0, sys.argv[1]); '
                      '\nwith patch("boto3.client", return_value=object()):\n import lambda_function\n'
                      ' assert callable(lambda_function.lambda_handler)\n')
            subprocess.run([sys.executable, '-I', '-c', script, extracted], check=True,
                           env={**DUMMY_ENV, 'PATH': os.environ.get('PATH', '')}, capture_output=True)

    def test_terraform_explicit_sources_form_an_importable_archive(self):
        config = (ROOT / 'terraform/statsLambda.tf').read_text()
        archive_block = config.split('data "archive_file" "stats_aggregator_function" {', 1)[1].split('\nlocals {', 1)[0]
        sources = re.findall(r'content\s*=\s*file\("\$\{path.module\}/([^\"]+)"\)\s*filename\s*=\s*"([^\"]+)"', archive_block)
        self.assertEqual({name for _, name in sources}, {'lambda_function.py', 'ledger.py', 'payload.py'})
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'terraform-declared.zip'
            with zipfile.ZipFile(archive, 'w') as package:
                for relative, name in sources:
                    package.write(ROOT / 'terraform' / relative, name)
            self.check_archive(archive)

    def test_workflow_bootstrap_and_code_update_include_only_runtime_modules(self):
        workflow = (ROOT / '.github/workflows/main.yml').read_text()
        self.assertIn('(cd stats_aggregator && zip ../terraform/stats_aggregator.zip lambda_function.py payload.py ledger.py)', workflow)
        matrix = re.search(r'- dir: stats_aggregator\s+function_var: \w+\s+package_files: ([^\n]+)', workflow)
        self.assertIsNotNone(matrix)
        self.assertEqual(matrix.group(1).split(), ['lambda_function.py', 'payload.py', 'ledger.py'])
        for members in [['lambda_function.py', 'ledger.py', 'payload.py'], matrix.group(1).split()]:
            with tempfile.TemporaryDirectory() as directory:
                archive = Path(directory) / 'workflow.zip'
                subprocess.run(['zip', '-q', str(archive), *members], cwd=ROOT / 'stats_aggregator', check=True,
                               env={'PATH': os.environ.get('PATH', '/usr/bin:/bin')})
                self.check_archive(archive)

    def test_payload_import_does_not_load_the_sdk(self):
        script = ('import sys; sys.path.insert(0, sys.argv[1]); '
                  'from stats_aggregator.payload import render_payload; '
                  'assert "boto3" not in sys.modules and "botocore" not in sys.modules')
        subprocess.run([sys.executable, '-I', '-c', script, str(ROOT)], check=True,
                       env={**DUMMY_ENV, 'PATH': os.environ.get('PATH', '')}, capture_output=True)

    def test_extracted_archive_runs_all_recovery_tests(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'recovery.zip'
            with zipfile.ZipFile(archive, 'w') as package:
                for name in ['lambda_function.py', 'payload.py', 'ledger.py']:
                    package.write(ROOT / 'stats_aggregator' / name, name)
            with zipfile.ZipFile(archive) as package:
                package.extractall(directory)
            script = ('import sys, unittest; sys.path[:0] = [sys.argv[1], sys.argv[2]]; '
                      'suite = unittest.defaultTestLoader.loadTestsFromNames('
                      '["test_ledger", "test_ingestion", "test_source_failures"]); '
                      'result = unittest.TextTestRunner(verbosity=1).run(suite); '
                      'sys.exit(not result.wasSuccessful())')
            result = subprocess.run([sys.executable, '-I', '-c', script, directory, str(ROOT / 'tests/stats')],
                env={**DUMMY_ENV, 'STATS_HANDLER_MODULE': 'lambda_function', 'PATH': os.environ.get('PATH', '')},
                capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            print('Extracted archive recovery matrix: ' + result.stderr.strip())
