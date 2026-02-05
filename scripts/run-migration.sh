#!/bin/bash

# 마이그레이션 실행 스크립트
# Usage: ./scripts/run-migration.sh [migration-file]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Supabase Migration Runner ===${NC}\n"

# .env.local 파일 체크
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    exit 1
fi

# Supabase URL 읽기
source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://your-project.supabase.co" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL not configured in .env.local${NC}"
    echo "Please set your actual Supabase project URL"
    exit 1
fi

# 마이그레이션 파일 지정
MIGRATION_FILE=${1:-"supabase/migrations/004_deduplication_support.sql"}

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "Migration file: ${GREEN}$MIGRATION_FILE${NC}"
echo -e "Supabase URL: ${GREEN}$NEXT_PUBLIC_SUPABASE_URL${NC}\n"

# 데이터베이스 연결 정보 추출
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's/.*\/\/\(.*\)\.supabase\.co/\1/p')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}Error: Could not extract project reference from URL${NC}"
    exit 1
fi

# DB 연결 문자열 생성
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo -e "${YELLOW}Connection Info:${NC}"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# psql 설치 확인
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}psql is not installed. Installing alternatives...${NC}\n"

    # Supabase CLI 사용 시도
    if command -v npx &> /dev/null; then
        echo -e "${GREEN}Using npx to install Supabase CLI...${NC}"
        npx supabase migration up
        exit 0
    else
        echo -e "${RED}Error: Neither psql nor npx is available${NC}"
        echo -e "\n${YELLOW}Manual installation options:${NC}"
        echo "1. Install PostgreSQL client: sudo apt-get install postgresql-client"
        echo "2. Install Supabase CLI: npm install -g supabase"
        echo "3. Run migration manually in Supabase Dashboard SQL Editor"
        echo ""
        echo "SQL file location: $MIGRATION_FILE"
        exit 1
    fi
fi

# 비밀번호 입력 요청
echo -e "${YELLOW}Please enter your database password:${NC}"
read -s DB_PASSWORD
echo ""

# psql로 마이그레이션 실행
echo -e "${GREEN}Running migration...${NC}\n"

PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -f $MIGRATION_FILE

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Migration completed successfully!${NC}"
else
    echo -e "\n${RED}✗ Migration failed${NC}"
    exit 1
fi
