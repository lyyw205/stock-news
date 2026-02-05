#!/bin/bash

# 로컬 개발 환경에서 RSS 수집 및 AI 처리를 실행하는 스크립트

echo "🔄 RSS 뉴스 수집 중..."
curl -X GET "http://localhost:3000/api/cron/fetch-rss" \
  -H "Authorization: Bearer ${CRON_SECRET:-your-cron-secret}" \
  -s | jq '.'

echo ""
echo "⏳ 5초 대기..."
sleep 5

echo "🤖 AI 처리 중..."
curl -X GET "http://localhost:3000/api/cron/process-articles" \
  -H "Authorization: Bearer ${CRON_SECRET:-your-cron-secret}" \
  -s | jq '.'

echo ""
echo "✅ 완료! 대시보드를 새로고침하세요."
