# AWS CI/CD (ECS Fargate + RDS + ALB)

This repo ships with:
- **Terraform** under `infra/` to provision: ECR, ECS cluster/service (Fargate), RDS Postgres, ALB, SGs, CloudWatch logs, and a GitHub OIDC role.
- **GitHub Actions** under `.github/workflows/`:
  - `ci.yml` — typecheck/lint/build/tests on PRs & main.
  - `cd-prod.yml` — build/push image to ECR, run DB migrations as a one-off ECS task, then update the ECS service.

## One-time setup

1. **Terraform variables** (example):
   ```bash
   cd infra
   terraform init
   terraform apply      -var='aws_region=us-east-1'      -var='name_prefix=agentic'      -var='github_repo=yourorg/agentic-trades-voice-agent'      -var='db_password=CHOOSE_A_STRONG_PASSWORD'
   ```
   Outputs include:
   - `github_actions_role_arn` (paste into your GitHub repo → Settings → Variables → `AWS_ROLE_ARN`)
   - `ecr_repo_name`, `ecr_repo_url`, `alb_dns_name`, `ecs_cluster`, `ecs_service`

2. **GitHub Repo Variables** (Settings → Secrets and variables → Actions → Variables):
   - `AWS_REGION` = (e.g.) `us-east-1`
   - `AWS_ACCOUNT_ID` = your 12-digit account
   - `AWS_ROLE_ARN` = value from Terraform output
   - `ECR_REPO` = value from Terraform output (`ecr_repo_name`)
   - `ECS_CLUSTER` = value from Terraform output
   - `ECS_SERVICE` = value from Terraform output
   - `PRIVATE_SUBNET_IDS` = `["subnet-aaa","subnet-bbb"]` (comma-separated JSON list)
   - `APP_SECURITY_GROUP_ID` = the app SG id (Terraform output `app_security_group_id`)

3. **App environment (ECS Task)**  
   For production, store sensitive keys in **AWS Secrets Manager** and reference them in the task definition (`secrets` array). Minimum required:
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `DATABASE_URL` (or use the provided env template; consider a Secrets Manager rotation policy)

4. **DNS & TLS**
   - Point your domain to the ALB DNS name (`alb_dns_name`).
   - For HTTPS, add an ACM cert in the same region and set `acm_certificate_arn` in Terraform to enable the 443 listener.

## Deploy

- Any push to `main` triggers **CI** and **CD**. The CD job:
  1. Builds and pushes a Docker image to ECR (`latest` + SHA tag).
  2. Runs **migrations** by launching a one-off ECS task with `npm run migrate`.
  3. Updates the ECS service to the new task definition + image.
  4. Waits for service stability and uses target group health checks (`/health`).

## Rollback

- In AWS Console → ECS → Services → Deployments, roll back to the previous task definition, or re-run the deployment with the older image tag.
- You can also revert the commit and push, which will redeploy the previous version.

## Notes

- RDS Postgres is created in **private subnets**; the ECS service runs in the same private subnets.
- Health check path is `/health`; adjust if needed.
- For blue/green, replace rolling update with **CodeDeploy** ECS deployment controller.
