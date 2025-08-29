# infra/secrets_kms.tf
# KMS + Secrets Manager examples for DATABASE_URL and API keys.

resource "aws_kms_key" "app" {
  description         = "KMS key for Agentic Trades app"
  deletion_window_in_days = 7
}

resource "aws_secretsmanager_secret" "database_url" {
  name = "agentic/DATABASE_URL"
  kms_key_id = aws_kms_key.app.arn
}

# You can create secret versions out-of-band or via Terraform:
# resource "aws_secretsmanager_secret_version" "database_url_v" {
#   secret_id     = aws_secretsmanager_secret.database_url.id
#   secret_string = "postgres://..."
# }