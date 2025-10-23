#!/bin/bash

# DynamoDB Setup Script for Sales Tracker
# This script helps you set up the DynamoDB table using AWS CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Sales Tracker DynamoDB Setup${NC}"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured.${NC}"
    echo "Please run: aws configure"
    exit 1
fi

# Get the app ID
APP_ID=${1:-"dbqznmct8mzz4"}
TABLE_NAME="SalesTracker-${APP_ID}"

echo -e "${YELLOW}Setting up DynamoDB table: ${TABLE_NAME}${NC}"

# Check if table already exists
if aws dynamodb describe-table --table-name "$TABLE_NAME" &> /dev/null; then
    echo -e "${YELLOW}Table ${TABLE_NAME} already exists.${NC}"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing table..."
        aws dynamodb delete-table --table-name "$TABLE_NAME"
        echo "Waiting for table to be deleted..."
        aws dynamodb wait table-not-exists --table-name "$TABLE_NAME"
    else
        echo "Using existing table."
        exit 0
    fi
fi

# Create the table using CloudFormation template
echo "Creating DynamoDB table..."

# Create a temporary CloudFormation template with the app ID
cat > temp-template.json << EOF
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "DynamoDB table for Sales Tracker application",
  "Parameters": {
    "AppId": {
      "Type": "String",
      "Default": "${APP_ID}",
      "Description": "Application ID for table naming"
    }
  },
  "Resources": {
    "SalesTrackerTable": {
      "Type": "AWS::DynamoDB::Table",
      "Properties": {
        "TableName": {
          "Fn::Sub": "SalesTracker-\${AppId}"
        },
        "AttributeDefinitions": [
          {
            "AttributeName": "PK",
            "AttributeType": "S"
          },
          {
            "AttributeName": "SK",
            "AttributeType": "S"
          },
          {
            "AttributeName": "GSI1PK",
            "AttributeType": "S"
          },
          {
            "AttributeName": "GSI1SK",
            "AttributeType": "S"
          },
          {
            "AttributeName": "GSI2PK",
            "AttributeType": "S"
          },
          {
            "AttributeName": "GSI2SK",
            "AttributeType": "S"
          }
        ],
        "KeySchema": [
          {
            "AttributeName": "PK",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "SK",
            "KeyType": "RANGE"
          }
        ],
        "GlobalSecondaryIndexes": [
          {
            "IndexName": "GSI1",
            "KeySchema": [
              {
                "AttributeName": "GSI1PK",
                "KeyType": "HASH"
              },
              {
                "AttributeName": "GSI1SK",
                "KeyType": "RANGE"
              }
            ],
            "Projection": {
              "ProjectionType": "ALL"
            }
          },
          {
            "IndexName": "GSI2",
            "KeySchema": [
              {
                "AttributeName": "GSI2PK",
                "KeyType": "HASH"
              },
              {
                "AttributeName": "GSI2SK",
                "KeyType": "RANGE"
              }
            ],
            "Projection": {
              "ProjectionType": "ALL"
            }
          }
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "TimeToLiveSpecification": {
          "AttributeName": "ttl",
          "Enabled": false
        },
        "PointInTimeRecoverySpecification": {
          "PointInTimeRecoveryEnabled": true
        }
      }
    }
  },
  "Outputs": {
    "TableName": {
      "Description": "DynamoDB table name",
      "Value": {
        "Ref": "SalesTrackerTable"
      }
    },
    "TableArn": {
      "Description": "DynamoDB table ARN",
      "Value": {
        "Fn::GetAtt": [
          "SalesTrackerTable",
          "Arn"
        ]
      }
    }
  }
}
EOF

# Deploy the CloudFormation stack
STACK_NAME="SalesTracker-${APP_ID}-Stack"
aws cloudformation deploy \
    --template-file temp-template.json \
    --stack-name "$STACK_NAME" \
    --parameter-overrides AppId="$APP_ID" \
    --capabilities CAPABILITY_IAM

# Clean up temporary file
rm temp-template.json

# Wait for table to be ready
echo "Waiting for table to be ready..."
aws dynamodb wait table-exists --table-name "$TABLE_NAME"

echo -e "${GREEN}✅ DynamoDB table created successfully!${NC}"
echo -e "${GREEN}Table Name: ${TABLE_NAME}${NC}"

# Get table ARN
TABLE_ARN=$(aws dynamodb describe-table --table-name "$TABLE_NAME" --query 'Table.TableArn' --output text)
echo -e "${GREEN}Table ARN: ${TABLE_ARN}${NC}"

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update your .env file with your AWS credentials:"
echo "   REACT_APP_AWS_REGION=us-east-1"
echo "   REACT_APP_AWS_ACCESS_KEY_ID=your_access_key"
echo "   REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key"
echo "   REACT_APP_AWS_APP_ID=${APP_ID}"
echo ""
echo "2. Start your React application:"
echo "   npm start"
echo ""
echo "3. Use the new DashboardDynamoDB component instead of Dashboard"
echo ""
echo -e "${GREEN}Setup complete! 🎉${NC}"
