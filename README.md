# sqs-ecs-polling-worker

## デプロイ

### 1. インフラストラクチャのデプロイ

```bash
cd packages/iac
pnpm cdk deploy \
  sqs-ecs-worker-stack \
  --require-approval never
```

### 2. Dockerイメージのビルドとプッシュ

```bash
cd ../../
ECR_REPOSITORY_URI=$(aws ssm get-parameter \
  --name /sqs-ecs-worker/worker/ecr-repository-uri \
  --query 'Parameter.Value' \
  --output text)

GIT_HASH=$(git rev-parse --short HEAD)

aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin ${ECR_REPOSITORY_URI}

docker build -t ${ECR_REPOSITORY_URI}:${GIT_HASH} .

docker push ${ECR_REPOSITORY_URI}:${GIT_HASH}
```

### 3. ecspressoでECSサービスをデプロイ

```bash
cd packages/iac/ecspresso

export IMAGE_TAG=$GIT_HASH
ecspresso diff # 確認
ecspresso deploy
```

### 4. オートスケーリングスタックのデプロイ

```bash
cd ../
pnpm cdk deploy \
  sqs-ecs-worker-autoscaling-stack \
  --require-approval never
```

**注意**: オートスケーリングスタックは、ECSサービスが作成された後にデプロイする必要があります。

### 5. テスト用メッセージの送信

```bash
QUEUE_URL=$(aws ssm get-parameter \
  --name /sqs-ecs-worker/worker/queue-url \
  --query 'Parameter.Value' \
  --output text)

aws sqs send-message \
  --queue-url ${QUEUE_URL} \
  --message-body "テストメッセージ"
```

## クリーンアップ

### 1. オートスケーリングスタックの削除

```bash
cd packages/iac
pnpm cdk destroy \
  sqs-ecs-worker-autoscaling-stack \
  --force
```

### 2. ECSサービスの削除

```bash
cd ecspresso
ecspresso delete --terminate --force
```

### 3. インフラストラクチャスタックの削除

```bash
cd ../
pnpm cdk destroy \
  sqs-ecs-worker-stack \
  --force
```
