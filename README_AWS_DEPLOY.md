# AWS Deployment (ECS + RDS) — Step-by-Step

## Prereqs
- AWS account with admin to create: VPC, ALB, ECS, ECR, RDS Postgres, KMS, Secrets Manager
- Terraform >= 1.6, Node 20.x, Docker
- GitHub repo with OIDC to assume an AWS role for CI/CD

## Steps
1. **Terraform init & plan**
   ```bash
   cd infra
   terraform init
   terraform apply -target=aws_ecr_repository.this
   terraform apply
   ```
2. **GitHub OIDC role**
   - Use `infra` outputs to configure `AWS_ROLE_TO_ASSUME` in GitHub repo secrets.

3. **Build & Push**
   - On push to `main`, `.github/workflows/cd-prod.yml` builds the image and updates ECS.
   - Or manually:
     ```bash
     docker build -t agentic .
     aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
     docker tag agentic:latest <acct>.dkr.ecr.<region>.amazonaws.com/agentic:latest
     docker push <acct>.dkr.ecr.<region>.amazonaws.com/agentic:latest
     ```

4. **Database migrations**
   - The CD workflow runs migrations. To run locally:
     ```bash
     npm run migrate
     ```

5. **DNS/TLS**
   - Point your domain at the ALB; provision TLS via ACM; update ALB listener.

6. **Secrets**
   - Store `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `TWILIO_AUTH_TOKEN` in AWS Secrets Manager.
   - Inject into task definition via environment or SSM parameters.

7. **Observability**
   - Enable OpenTelemetry metrics to CloudWatch EMF or Prometheus.
   - Import provided dashboards in `admin/README_DASHBOARDS.md`.

8. **Autoscaling**
   - Apply `infra/autoscaling.tf` to enable TargetTracking on ECS service CPU and ALB requests.

## Encryption & Secrets
- RDS: ensure `storage_encrypted=true` and `kms_key_id` set (see `infra/rds.tf`).
- Secrets: store `PII_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `TWILIO_AUTH_TOKEN` in AWS Secrets Manager.
- App-level PII encryption uses AES-256-GCM via `src/lib/crypto.ts`.
