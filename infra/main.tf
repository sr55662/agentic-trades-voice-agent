terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix = var.name_prefix
}

# Optional: GitHub OIDC provider (create if you don't already have one)
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Role assumed by GitHub Actions
data "aws_iam_policy_document" "github_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${local.name_prefix}-gha"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

# Minimal policy for ECR/ECS/Logs
data "aws_iam_policy_document" "gha_policy" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:*",
      "ecs:*",
      "iam:PassRole",
      "logs:*",
      "ssm:GetParameters",
      "secretsmanager:GetSecretValue",
      "ec2:Describe*"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "gha" {
  name   = "${local.name_prefix}-gha-policy"
  policy = data.aws_iam_policy_document.gha_policy.json
}

resource "aws_iam_role_policy_attachment" "gha_attach" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.gha.arn
}

output "github_actions_role_arn" { value = aws_iam_role.github_actions.arn }
