#!/usr/bin/env node

/**
 * Mac Claw MCP Server
 * AI Mac Marketplace - MCP Tools (62 tools)
 *
 * Supports both stdio and HTTP transport:
 *   stdio: MACCLAW_API_KEY=mc_xxx node server.js
 *   HTTP:  MACCLAW_API_KEY=mc_xxx MACCLAW_TRANSPORT=http MACCLAW_PORT=3006 node server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MacClawApiClient } from './lib/api-client.js';

const API_KEY = process.env.MACCLAW_API_KEY || '';
const BASE_URL = process.env.MACCLAW_BASE_URL || 'https://macclaw.jp';
const TRANSPORT = process.env.MACCLAW_TRANSPORT || 'stdio';
const PORT = parseInt(process.env.MACCLAW_PORT || '3006', 10);

if (!API_KEY) {
    console.error('[macclaw-mcp] Warning: MACCLAW_API_KEY is not set.');
    console.error('[macclaw-mcp] Get your API key at: https://macclaw.jp/mypage/api-keys/');
}

const client = new MacClawApiClient(API_KEY, BASE_URL);

const server = new Server(
    { name: 'macclaw-mcp-server', version: '1.9.0' },
    { capabilities: { tools: {} } }
);

// ==========================================
// Tool definitions (62 tools)
// ==========================================

const TOOLS = [
    // ------------------------------------------
    // 商品 (7)
    // ------------------------------------------
    {
        name: 'items_list',
        description: 'Mac Clawの商品一覧を取得。デバイス種別・チップ・メモリ・価格帯・ステータスでフィルタリング可能。ページネーション対応',
        inputSchema: {
            type: 'object',
            properties: {
                device_type: { type: 'string', enum: ['mac_mini', 'mac_studio'], description: 'デバイス種別 (mac_mini=Mac Mini, mac_studio=Mac Studio)' },
                chip: { type: 'string', description: 'チップ名で絞り込み (例: M4 Pro, M2 Ultra)' },
                memory_min: { type: 'integer', description: '最小メモリ容量 (GB)' },
                price_min: { type: 'integer', description: '最低価格 (円)' },
                price_max: { type: 'integer', description: '最高価格 (円)' },
                status: { type: 'string', enum: ['active', 'sold', 'draft', 'cancelled'], description: '出品ステータス (active=出品中, sold=売却済, draft=下書き, cancelled=キャンセル)' },
                sort: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'], description: '並び順 (newest=新着順, price_asc=価格安順, price_desc=価格高順)' },
                page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)' },
                per_page: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20)' },
            },
        },
    },
    {
        name: 'items_get',
        description: '商品の詳細情報を取得。スペック・価格・コンディション・出品者情報・いいね数・コメントを含む',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: '商品ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'items_search',
        description: 'キーワードで商品をテキスト検索。タイトル・説明文・チップ名などを横断検索する',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: '検索キーワード (例: M4 Pro 48GB)' },
                page: { type: 'integer', description: 'ページ番号' },
                per_page: { type: 'integer', description: '1ページあたりの件数' },
            },
            required: ['query'],
        },
    },
    {
        name: 'items_create',
        description: '新しい商品を出品する（下書き状態で作成）。items_publishで公開する',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: '出品タイトル (例: Mac Mini M4 Pro / 24GB / 512GB)' },
                description: { type: 'string', description: '商品説明文 (コンディション詳細・付属品・使用状況など)' },
                device_type: { type: 'string', description: 'デバイス種別 (mac_mini / mac_studio)' },
                model_year: { type: 'string', description: 'モデル年 (例: 2024, 2023)' },
                chip: { type: 'string', description: 'チップ名 (例: M4 Pro, M2 Ultra)' },
                memory_gb: { type: 'integer', description: '統合メモリ容量 (GB)' },
                storage_gb: { type: 'integer', description: 'SSD容量 (GB)' },
                price: { type: 'integer', description: '販売価格 (円)' },
                has_box: { type: 'boolean', description: '元箱あり/なし' },
                has_10gbe: { type: 'boolean', description: '10GbEオプション搭載 (Mac Miniのみ)' },
                purchase_period: { type: 'string', description: '購入時期 (例: 2024年12月)' },
                sell_reason: { type: 'string', description: '売却理由' },
                condition_grade: { type: 'string', description: 'コンディショングレード (S=未使用/新品同様, A=美品, B=良品, C=並品)' },
                condition_note: { type: 'string', description: 'コンディション補足説明 (傷・汚れの詳細など)' },
                shipping_payer: { type: 'string', description: '送料負担 (seller=出品者負担, buyer=購入者負担)' },
                shipping_from_pref: { type: 'string', description: '発送元都道府県 (例: 東京都)' },
                shipping_days: { type: 'string', description: '発送までの日数 (例: 1〜2日, 3〜7日)' },
                negotiable: { type: 'integer', enum: [0, 1], description: '価格交渉可フラグ (0=即決のみ, 1=交渉可)' },
                min_price: { type: 'integer', description: '出品者向け内部設定 (円)。negotiable=1時のみ有効' },
            },
            required: ['title', 'description', 'device_type', 'model_year', 'chip', 'memory_gb', 'storage_gb', 'price'],
        },
    },
    {
        name: 'items_update',
        description: '出品中または下書きの商品情報を編集する。指定したフィールドのみ更新',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: '商品ID' },
                title: { type: 'string', description: '出品タイトル' },
                description: { type: 'string', description: '商品説明文' },
                device_type: { type: 'string', description: 'デバイス種別' },
                model_year: { type: 'string', description: 'モデル年' },
                chip: { type: 'string', description: 'チップ名' },
                memory_gb: { type: 'integer', description: '統合メモリ容量 (GB)' },
                storage_gb: { type: 'integer', description: 'SSD容量 (GB)' },
                price: { type: 'integer', description: '販売価格 (円)' },
                has_box: { type: 'boolean', description: '元箱あり/なし' },
                has_10gbe: { type: 'boolean', description: '10GbEオプション搭載' },
                purchase_period: { type: 'string', description: '購入時期' },
                sell_reason: { type: 'string', description: '売却理由' },
                condition_grade: { type: 'string', description: 'コンディショングレード (S/A/B/C)' },
                condition_note: { type: 'string', description: 'コンディション補足説明' },
                shipping_payer: { type: 'string', description: '送料負担 (seller/buyer)' },
                shipping_from_pref: { type: 'string', description: '発送元都道府県' },
                shipping_days: { type: 'string', description: '発送までの日数' },
                negotiable: { type: 'integer', enum: [0, 1], description: '価格交渉可フラグ (0=即決のみ, 1=交渉可)' },
                min_price: { type: 'integer', description: '出品者向け内部設定 (円)。negotiable=1時のみ有効' },
            },
            required: ['id'],
        },
    },
    {
        name: 'items_publish',
        description: '下書き状態の商品を公開する。公開後は出品中（active）ステータスになり購入可能になる',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: '公開する商品ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'items_cancel',
        description: '出品中の商品をキャンセル（取り下げ）する。取引成立前の商品のみキャンセル可能',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: 'キャンセルする商品ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'items_self_list',
        description: 'セルフリスティング: デバイスが自己診断データを送信し、相場算出→出品→検品→公開を一括実行。特許クレームC対応',
        inputSchema: {
            type: 'object',
            properties: {
                device_type: { type: 'string', enum: ['mac_mini', 'mac_studio'], description: 'デバイス種別' },
                model_year: { type: 'string', description: 'モデル年 (例: 2024)' },
                chip: { type: 'string', description: 'チップ名 (例: M4 Pro)' },
                memory_gb: { type: 'integer', description: 'メモリ容量 (GB)' },
                storage_gb: { type: 'integer', description: 'ストレージ容量 (GB)' },
                hardware_data: { type: 'object', description: 'system_profiler等のハードウェア情報JSON' },
                geekbench_single: { type: 'integer', description: 'Geekbenchシングルスコア (任意)' },
                geekbench_multi: { type: 'integer', description: 'Geekbenchマルチスコア (任意)' },
                disk_health_percent: { type: 'integer', description: 'SSD健康度 0-100 (任意)' },
                signature: { type: 'string', description: 'Ed25519署名 (base64, 任意)' },
                nonce: { type: 'string', description: 'チャレンジnonce (任意)' },
                condition_grade: { type: 'string', enum: ['like_new', 'good', 'fair', 'poor'], description: 'コンディション (デフォルト: good)' },
                sell_reason: { type: 'string', description: '出品理由 (デフォルト: upgrade)' },
                title_override: { type: 'string', description: 'タイトル上書き (任意)' },
                min_price_ratio: { type: 'number', description: '最低価格比率 0.5-1.0 (デフォルト: 0.85)' },
                auto_publish: { type: 'boolean', description: '自動公開 (デフォルト: true)' },
            },
            required: ['device_type', 'model_year', 'chip', 'memory_gb', 'storage_gb', 'hardware_data'],
        },
    },

    // ------------------------------------------
    // 相場 (5)
    // ------------------------------------------
    {
        name: 'market_price_range',
        description: 'チップ別・デバイス別の価格レンジ（最安値・最高値・中央値・平均値）を取得。相場把握に使用',
        inputSchema: {
            type: 'object',
            properties: {
                chip: { type: 'string', description: 'チップ名で絞り込み (例: M4 Pro)' },
                device_type: { type: 'string', description: 'デバイス種別で絞り込み (mac_mini / mac_studio)' },
            },
        },
    },
    {
        name: 'market_recent_sales',
        description: '直近の成約データ一覧を取得。実際に売れた価格・コンディション・成約日時を確認できる',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'integer', description: '取得件数 (デフォルト: 20)' },
                chip: { type: 'string', description: 'チップ名で絞り込み' },
            },
        },
    },
    {
        name: 'market_price_suggest',
        description: '指定スペックの推定相場価格を算出。成約データをもとにAIが適正価格を提案する',
        inputSchema: {
            type: 'object',
            properties: {
                chip: { type: 'string', description: 'チップ名 (例: M4 Pro)' },
                memory_gb: { type: 'integer', description: '統合メモリ容量 (GB)' },
                device_type: { type: 'string', description: 'デバイス種別 (mac_mini / mac_studio)' },
                condition_grade: { type: 'string', description: 'コンディショングレード (S/A/B/C)' },
            },
            required: ['chip', 'memory_gb'],
        },
    },
    {
        name: 'market_retail_compare',
        description: '指定スペックの新品Apple公式価格との比較情報を取得。中古割引率・お得度を算出',
        inputSchema: {
            type: 'object',
            properties: {
                chip: { type: 'string', description: 'チップ名 (例: M4 Pro)' },
                memory_gb: { type: 'integer', description: '統合メモリ容量 (GB)' },
                storage_gb: { type: 'integer', description: 'SSD容量 (GB)' },
                device_type: { type: 'string', description: 'デバイス種別 (mac_mini / mac_studio)' },
                price: { type: 'integer', description: '比較する価格 (円)' },
            },
            required: ['chip', 'memory_gb', 'storage_gb', 'device_type', 'price'],
        },
    },
    {
        name: 'market_demand_score',
        description: '商品の需要スコア（0〜100）を取得。スコアが高いほど早期成約が期待できる',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '需要スコアを調べる商品ID' },
            },
            required: ['item_id'],
        },
    },

    // ------------------------------------------
    // 決済 (4)
    // ------------------------------------------
    {
        name: 'checkout_create',
        description: '商品のStripe Checkout URLを生成。購入者はこのURLでクレジットカード決済を行う',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '購入する商品ID' },
            },
            required: ['item_id'],
        },
    },
    {
        name: 'checkout_setup',
        description: 'エージェント用カードセットアップURL生成。保存済みカードで自動決済を行うためのカード登録URLを返す',
        inputSchema: {
            type: 'object',
            properties: {
                label: { type: 'string', description: 'カードの識別ラベル（例: 開発用カード）' },
                auto_approve_limit: { type: 'integer', description: '自動承認上限金額（円）。0=手動承認必須（デフォルト: 0）' },
            },
        },
    },
    {
        name: 'checkout_agent_pay',
        description: '保存済みカードで自動決済。セットアップ済みのカードを使って商品を即時購入する',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '購入する商品ID' },
                public_id: { type: 'string', description: '商品のpublic_id（item_idの代わりに使用可能）' },
            },
        },
    },
    {
        name: 'checkout_payment_methods',
        description: '登録済みカード一覧を取得。セットアップ済みの支払い方法とその設定を確認する',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },

    // ------------------------------------------
    // 取引 (4)
    // ------------------------------------------
    {
        name: 'transactions_list',
        description: '自分が関わる取引一覧を取得。buyer（購入者）またはseller（出品者）でフィルタリング可能',
        inputSchema: {
            type: 'object',
            properties: {
                role: { type: 'string', enum: ['buyer', 'seller'], description: '役割フィルタ (buyer=購入者として, seller=出品者として)' },
                status: { type: 'string', description: '取引ステータスで絞り込み (例: payment_pending, paid, shipped, completed)' },
                page: { type: 'integer', description: 'ページ番号' },
            },
        },
    },
    {
        name: 'transactions_get',
        description: '取引の詳細情報を取得。決済状況・発送情報・メッセージ履歴のサマリーを含む',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: '取引ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'transactions_ship',
        description: '取引に発送情報を登録する。追跡番号を入力すると購入者に発送通知が送られる',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: '取引ID' },
                tracking_number: { type: 'string', description: '配送追跡番号 (例: 1234-5678-9012)' },
            },
            required: ['id', 'tracking_number'],
        },
    },
    {
        name: 'transactions_dispute',
        description: '取引に対して異議申立（dispute）を行う。商品説明との相違や未着など、問題がある場合に使用',
        inputSchema: {
            type: 'object',
            properties: {
                transaction_id: { type: 'integer', description: '取引ID' },
                reason: { type: 'string', description: '異議申立の理由（詳細に記載）' },
            },
            required: ['transaction_id', 'reason'],
        },
    },

    // ------------------------------------------
    // メッセージ (2)
    // ------------------------------------------
    {
        name: 'messages_list',
        description: '取引に紐づくメッセージ一覧を時系列で取得。出品者・購入者間のやり取りを確認できる',
        inputSchema: {
            type: 'object',
            properties: {
                transaction_id: { type: 'integer', description: '取引ID' },
            },
            required: ['transaction_id'],
        },
    },
    {
        name: 'messages_send',
        description: '取引相手にメッセージを送信。質問・交渉・発送連絡などに使用する',
        inputSchema: {
            type: 'object',
            properties: {
                transaction_id: { type: 'integer', description: '取引ID' },
                body: { type: 'string', description: 'メッセージ本文' },
            },
            required: ['transaction_id', 'body'],
        },
    },

    // ------------------------------------------
    // ユーザー (3)
    // ------------------------------------------
    {
        name: 'users_me',
        description: '自分のプロフィール・出品数・成約数・評価スコアなどの統計情報を取得する',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'users_get',
        description: '指定ユーザーのプロフィール・出品履歴・レビュー評価を取得。信頼性確認に使用',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: 'ユーザーID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'users_update_profile',
        description: '自分のプロフィール情報（表示名・自己紹介）を更新する',
        inputSchema: {
            type: 'object',
            properties: {
                display_name: { type: 'string', description: '表示名' },
                bio: { type: 'string', description: '自己紹介文' },
            },
        },
    },
    {
        name: 'users_register_key',
        description: 'Ed25519公開鍵を登録する。検品データの署名検証に使用。1ユーザー1鍵（上書き）',
        inputSchema: {
            type: 'object',
            properties: {
                public_key: { type: 'string', description: 'Ed25519公開鍵 (base64エンコード、32バイト)' },
                key_type: { type: 'string', enum: ['ed25519', 'rsa'], description: '鍵タイプ (デフォルト: ed25519)' },
            },
            required: ['public_key'],
        },
    },

    // ------------------------------------------
    // ソーシャル (3)
    // ------------------------------------------
    {
        name: 'social_like',
        description: '商品にいいね / いいね解除（トグル）。ウォッチリスト的に使用可能',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: 'いいねする商品ID' },
            },
            required: ['item_id'],
        },
    },
    {
        name: 'social_comment',
        description: '商品ページにコメントを投稿。質問・値下げ交渉・感想などを公開メッセージとして投稿',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: 'コメントする商品ID' },
                body: { type: 'string', description: 'コメント本文' },
            },
            required: ['item_id', 'body'],
        },
    },
    {
        name: 'social_follow',
        description: 'ユーザーをフォロー / フォロー解除（トグル）。フォロー中のユーザーの新着出品を追跡できる',
        inputSchema: {
            type: 'object',
            properties: {
                user_id: { type: 'integer', description: 'フォローするユーザーID' },
            },
            required: ['user_id'],
        },
    },

    // ------------------------------------------
    // レビュー (2)
    // ------------------------------------------
    {
        name: 'reviews_list',
        description: 'ユーザーまたは商品に紐づくレビュー一覧を取得。評価・コメント・投稿日時を含む',
        inputSchema: {
            type: 'object',
            properties: {
                user_id: { type: 'integer', description: 'ユーザーIDで絞り込み' },
                item_id: { type: 'integer', description: '商品IDで絞り込み' },
                page: { type: 'integer', description: 'ページ番号' },
            },
        },
    },
    {
        name: 'reviews_post',
        description: '取引完了後にレビューを投稿。評価（1〜5）とコメントで取引相手を評価する',
        inputSchema: {
            type: 'object',
            properties: {
                transaction_id: { type: 'integer', description: 'レビュー対象の取引ID' },
                rating: { type: 'integer', description: '評価 (1=最低 〜 5=最高)' },
                comment: { type: 'string', description: 'レビューコメント' },
            },
            required: ['transaction_id', 'rating'],
        },
    },

    // ------------------------------------------
    // ウォッチ (5)
    // ------------------------------------------
    {
        name: 'watch_create',
        description: '希望スペック・価格条件を登録。条件に合う商品が出品されたら自動通知を受け取る',
        inputSchema: {
            type: 'object',
            properties: {
                label: { type: 'string', description: 'ウォッチ名 (例: M4 Pro 48GB 予算15万円以下)' },
                conditions: {
                    type: 'object',
                    description: 'ウォッチ条件 (device_type, chip, memory_gb_min, price_max, condition_gradeを指定)',
                    properties: {
                        device_type: { type: 'string', description: 'デバイス種別 (mac_mini / mac_studio)' },
                        chip: { type: 'string', description: 'チップ名 (例: M4 Pro)' },
                        memory_gb_min: { type: 'integer', description: '最小メモリ容量 (GB)' },
                        price_max: { type: 'integer', description: '最高価格 (円)' },
                        condition_grade: { type: 'string', description: 'コンディショングレード以上 (S/A/B/C)' },
                    },
                },
                notify_method: { type: 'string', enum: ['api', 'email'], description: '通知方法 (api=API通知, email=メール通知)' },
            },
            required: ['label', 'conditions'],
        },
    },
    {
        name: 'watch_list',
        description: '登録中のウォッチ一覧を取得。条件・通知方法・マッチ件数を確認できる',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'watch_delete',
        description: 'ウォッチを削除する。不要になった条件通知を解除する',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: '削除するウォッチID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'watch_check',
        description: '全アクティブウォッチの条件チェックを実行。新着マッチがあれば自動通知を送る',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'watch_matches',
        description: 'ウォッチにマッチした商品の履歴を取得。通知済み/未通知のステータスを含む',
        inputSchema: {
            type: 'object',
            properties: {
                watch_id: { type: 'integer', description: '特定ウォッチIDで絞り込み (省略時は全ウォッチ)' },
                page: { type: 'integer', description: 'ページ番号' },
            },
        },
    },

    // ------------------------------------------
    // 検品 (3)
    // ------------------------------------------
    {
        name: 'inspect_submit',
        description: '商品のリモート検品データを送信。署名付きで送信すると verified=true になる。チャレンジ-レスポンス方式: inspect_challenge でnonce取得→hardware_data+nonceをEd25519署名→このツールで送信',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '検品対象の商品ID' },
                hardware_data: { type: 'object', description: 'ハードウェア情報 (system_profilerの出力等をJSONで)' },
                geekbench_single: { type: 'integer', description: 'Geekbenchシングルコアスコア' },
                geekbench_multi: { type: 'integer', description: 'Geekbenchマルチコアスコア' },
                disk_health_percent: { type: 'integer', description: 'ディスク健康度 (0-100%)' },
                disk_total_bytes: { type: 'integer', description: 'ディスク総容量 (bytes)' },
                disk_used_bytes: { type: 'integer', description: 'ディスク使用量 (bytes)' },
                nonce: { type: 'string', description: 'inspect_challengeで取得したnonce (署名検証時に必要)' },
                signature: { type: 'string', description: 'Ed25519署名 (base64)。メッセージ = JSON(hardware_data) + ":" + nonce' },
                command_log: { type: 'object', description: 'コマンド実行ログ (command, output, timestamp, pid)' },
            },
            required: ['item_id', 'hardware_data'],
        },
    },
    {
        name: 'inspect_get',
        description: '商品の検品データを取得。verification_method (none/signature/challenge) で真正性レベルを確認できる',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '商品ID' },
            },
            required: ['item_id'],
        },
    },
    {
        name: 'inspect_challenge',
        description: '検品チャレンジ（nonce）を発行する。購入検討者が出品者にリモート検品を要求する際に使用。nonceの有効期限は30分',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '検品対象の商品ID' },
            },
            required: ['item_id'],
        },
    },

    // ------------------------------------------
    // 通知 (3)
    // ------------------------------------------
    {
        name: 'notifications_broadcast',
        description: 'ウォッチ登録ユーザーに新着商品の通知を一括送信する。出品者が自分の商品を宣伝する際に使用',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '通知対象の商品ID (自分の出品のみ)' },
            },
            required: ['item_id'],
        },
    },
    {
        name: 'notifications_list',
        description: '自分の通知一覧を取得。ウォッチマッチ・新着出品・値下げ・システム通知を含む',
        inputSchema: {
            type: 'object',
            properties: {
                unread_only: { type: 'boolean', description: '未読のみ取得する場合 true' },
                page: { type: 'integer', description: 'ページ番号' },
            },
        },
    },
    {
        name: 'notifications_read',
        description: '通知を既読にする。IDを指定すると単一既読、省略すると全既読になる',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'integer', description: '既読にする通知ID (省略で全既読)' },
            },
        },
    },

    {
        name: 'notifications_settings',
        description: '通知設定の取得・更新。settingsパラメータを省略すると現在の設定を返す。settingsを指定すると更新後の設定を返す',
        inputSchema: {
            type: 'object',
            properties: {
                settings: {
                    type: 'object',
                    description: '更新する設定 (省略で取得のみ)。キー: like, price_change, watch_match, new_listing, system。値: true/false',
                    properties: {
                        like: { type: 'boolean', description: 'いいね通知' },
                        price_change: { type: 'boolean', description: '価格変更通知' },
                        watch_match: { type: 'boolean', description: 'ウォッチマッチ通知' },
                        new_listing: { type: 'boolean', description: '新着出品通知' },
                        system: { type: 'boolean', description: 'システム通知' },
                    },
                },
            },
        },
    },

    // ------------------------------------------
    // エージェント (1)
    // ------------------------------------------
    {
        name: 'agent_upgrade_plan',
        description: '買い替えシミュレーション。現在のスペックを入力すると、売却予想額・ターゲット機の相場・差額を計算する',
        inputSchema: {
            type: 'object',
            properties: {
                current_device_type: { type: 'string', description: '現在のデバイス種別 (mac_mini / mac_studio)' },
                current_chip: { type: 'string', description: '現在のチップ名 (例: M2 Pro)' },
                current_memory_gb: { type: 'integer', description: '現在のメモリ容量 (GB)' },
                current_storage_gb: { type: 'integer', description: '現在のストレージ容量 (GB)' },
                target_chip: { type: 'string', description: 'アップグレード先のチップ名 (例: M4 Pro)' },
                target_memory_gb: { type: 'integer', description: 'アップグレード先のメモリ容量 (GB)' },
            },
            required: ['current_chip', 'current_memory_gb'],
        },
    },

    // ------------------------------------------
    // 決済追加 (2)
    // ------------------------------------------
    {
        name: 'payment_status',
        description: '取引の決済状態を確認する。Stripe決済ID・金額・手数料・ステータスを取得',
        inputSchema: {
            type: 'object',
            properties: {
                transaction_id: { type: 'integer', description: '取引ID' },
            },
            required: ['transaction_id'],
        },
    },
    {
        name: 'payment_refund',
        description: '返金リクエストを実行する。pending_shipまたはshippedステータスの取引のみ可能',
        inputSchema: {
            type: 'object',
            properties: {
                transaction_id: { type: 'integer', description: '返金する取引ID' },
                reason: { type: 'string', description: '返金理由' },
            },
            required: ['transaction_id'],
        },
    },

    // ------------------------------------------
    // Connect (2)
    // ------------------------------------------
    {
        name: 'connect_status',
        description: 'Stripe Connect（売上受取口座）の設定状態を確認する',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'connect_balance',
        description: 'Stripe Connect口座の残高（利用可能額・保留額）を取得する',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },

    // ------------------------------------------
    // スペック (3)
    // ------------------------------------------
    {
        name: 'specs_chip_list',
        description: 'Mac Clawが対応するAppleシリコンチップ一覧を取得。M1〜M4系列・Ultra/Pro/Maxを含む',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'specs_chip_detail',
        description: '指定チップの詳細スペック（CPU/GPU/NPUコア数・対応メモリ上限・対応デバイス）を取得',
        inputSchema: {
            type: 'object',
            properties: {
                chip: { type: 'string', description: 'チップ名 (例: M4 Pro, M2 Ultra)' },
            },
            required: ['chip'],
        },
    },
    {
        name: 'specs_device_models',
        description: 'Mac Mini / Mac Studioのモデル年別・チップ別の構成オプション一覧を取得',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },

    // ------------------------------------------
    // 統計 (1)
    // ------------------------------------------
    {
        name: 'stats_dashboard',
        description: 'マーケットプレイスの統計ダッシュボードを取得。総出品数・成約数・平均成約価格・人気チップランキングを含む',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },

    // ------------------------------------------
    // ヘルス (1)
    // ------------------------------------------
    {
        name: 'health',
        description: 'Mac Claw APIのヘルスチェック。認証不要。サーバー稼働状況とバージョン情報を返す',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },

    // ------------------------------------------
    // 交渉 (3)
    // ------------------------------------------
    {
        name: 'negotiate_offer',
        description: '商品への価格交渉オファーを送信。出品者に通知が届き、承認・辞退・カウンターオファーで返答される。offer_priceは出品価格未満で指定',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '交渉する商品ID' },
                public_id: { type: 'string', description: '商品のpublic_id（item_idの代わりに使用可能）' },
                offer_price: { type: 'integer', description: '提示価格 (円、1000〜9,999,999)' },
                message: { type: 'string', description: '出品者へのメッセージ (500文字以内、任意)' },
            },
            required: ['offer_price'],
        },
    },
    {
        name: 'negotiate_respond',
        description: '受け取った交渉オファーに返答する（出品者専用）。accept=承認して決済へ、reject=辞退、counter=カウンターオファー提示',
        inputSchema: {
            type: 'object',
            properties: {
                negotiation_id: { type: 'integer', description: '交渉ID' },
                action: { type: 'string', enum: ['accept', 'reject', 'counter'], description: '返答アクション' },
                counter_price: { type: 'integer', description: 'カウンター価格 (counter時のみ必須)' },
                message: { type: 'string', description: '買い手へのメッセージ (500文字以内、任意)' },
            },
            required: ['negotiation_id', 'action'],
        },
    },
    {
        name: 'negotiate_history',
        description: '自分が関わる価格交渉の履歴を取得。buyer/seller両方の交渉が表示される。item_idで特定商品の交渉のみフィルタ可能',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '商品IDでフィルタ (省略で全交渉)' },
                public_id: { type: 'string', description: '商品のpublic_id（item_idの代わりに使用可能）' },
                page: { type: 'integer', description: 'ページ番号 (デフォルト: 1)' },
                per_page: { type: 'integer', description: '1ページあたりの件数 (デフォルト: 20、最大: 50)' },
            },
        },
    },
    // === JPYC決済 (5) ===
    {
        name: 'jpyc_checkout',
        description: 'JPYC（日本円ステーブルコイン）で商品を購入する。ASIウォレットアドレスと送金額を返す。JPYC決済は手数料5%（カード決済8%より安い）。Polygonネットワークで送金',
        inputSchema: {
            type: 'object',
            properties: {
                item_id: { type: 'integer', description: '商品ID' },
                buyer_wallet_address: { type: 'string', description: '購入者のPolygonウォレットアドレス (0x...)' },
            },
            required: ['item_id', 'buyer_wallet_address'],
        },
    },
    {
        name: 'jpyc_status',
        description: 'JPYC決済の着金状態を確認する。waiting/confirmed/expired/cancelledのいずれかを返す',
        inputSchema: {
            type: 'object',
            properties: {
                pending_id: { type: 'integer', description: 'JPYC決済セッションID（jpyc_checkoutの戻り値）' },
            },
            required: ['pending_id'],
        },
    },
    {
        name: 'jpyc_payout_status',
        description: 'JPYC取引の出品者への送金状態を確認する。payout_tx_hashがあれば送金済み',
        inputSchema: {
            type: 'object',
            properties: {
                transaction_id: { type: 'integer', description: '取引ID' },
            },
            required: ['transaction_id'],
        },
    },
    {
        name: 'jpyc_wallet_register',
        description: 'JPYC売上受取用のPolygonウォレットアドレスを登録する。出品者はこれを登録しないとJPYC決済の売上を受け取れない',
        inputSchema: {
            type: 'object',
            properties: {
                polygon_wallet_address: { type: 'string', description: 'Polygonウォレットアドレス (0x...)' },
            },
            required: ['polygon_wallet_address'],
        },
    },
    {
        name: 'jpyc_balance',
        description: 'ASIプラットフォームウォレットのJPYC残高とPOL（ガス代）残高を確認する',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
];

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));

// Handle tool calls
const handleToolCall = async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result;
        switch (name) {
            // 商品
            case 'items_list':
                result = await client.itemsList(args || {});
                break;
            case 'items_get':
                result = await client.itemsGet(args.id);
                break;
            case 'items_search':
                result = await client.itemsSearch(args.query, {
                    ...(args.page !== undefined && { page: args.page }),
                    ...(args.per_page !== undefined && { per_page: args.per_page }),
                });
                break;
            case 'items_create':
                result = await client.itemsCreate(args);
                break;
            case 'items_update': {
                const { id, ...data } = args;
                result = await client.itemsUpdate(id, data);
                break;
            }
            case 'items_publish':
                result = await client.itemsPublish(args.id);
                break;
            case 'items_cancel':
                result = await client.itemsCancel(args.id);
                break;
            case 'items_self_list':
                result = await client.itemsSelfList(args);
                break;

            // 相場
            case 'market_price_range':
                result = await client.marketPriceRange(args || {});
                break;
            case 'market_recent_sales':
                result = await client.marketRecentSales(args || {});
                break;
            case 'market_price_suggest':
                result = await client.marketPriceSuggest(args);
                break;
            case 'market_retail_compare':
                result = await client.marketRetailCompare(args);
                break;
            case 'market_demand_score':
                result = await client.marketDemandScore(args.item_id);
                break;

            // 決済
            case 'checkout_create':
                result = await client.checkoutCreate(args.item_id);
                break;
            case 'checkout_setup':
                result = await client.checkoutSetup(args || {});
                break;
            case 'checkout_agent_pay':
                result = await client.checkoutAgentPay(args || {});
                break;
            case 'checkout_payment_methods':
                result = await client.checkoutPaymentMethods();
                break;

            // 取引
            case 'transactions_list':
                result = await client.transactionsList(args || {});
                break;
            case 'transactions_get':
                result = await client.transactionsGet(args.id);
                break;
            case 'transactions_ship':
                result = await client.transactionsShip(args.id, args.tracking_number);
                break;
            case 'transactions_dispute':
                result = await client.transactionsDispute(args.transaction_id, args.reason);
                break;

            // メッセージ
            case 'messages_list':
                result = await client.messagesList(args.transaction_id);
                break;
            case 'messages_send':
                result = await client.messagesSend(args.transaction_id, args.body);
                break;

            // ユーザー
            case 'users_me':
                result = await client.usersMe();
                break;
            case 'users_get':
                result = await client.usersGet(args.id);
                break;
            case 'users_update_profile':
                result = await client.usersUpdateProfile(args || {});
                break;
            case 'users_register_key':
                result = await client.usersRegisterKey(args);
                break;

            // ソーシャル
            case 'social_like':
                result = await client.socialLike(args.item_id);
                break;
            case 'social_comment':
                result = await client.socialComment(args.item_id, args.body);
                break;
            case 'social_follow':
                result = await client.socialFollow(args.user_id);
                break;

            // レビュー
            case 'reviews_list':
                result = await client.reviewsList(args || {});
                break;
            case 'reviews_post':
                result = await client.reviewsPost(args.transaction_id, args.rating, args.comment);
                break;

            // ウォッチ
            case 'watch_create':
                result = await client.watchCreate(args);
                break;
            case 'watch_list':
                result = await client.watchList();
                break;
            case 'watch_delete':
                result = await client.watchDelete(args.id);
                break;
            case 'watch_check':
                result = await client.watchCheck();
                break;
            case 'watch_matches':
                result = await client.watchMatches(args || {});
                break;

            // 検品
            case 'inspect_submit':
                result = await client.inspectSubmit(args);
                break;
            case 'inspect_get':
                result = await client.inspectGet(args.item_id);
                break;
            case 'inspect_challenge':
                result = await client.inspectChallenge(args.item_id);
                break;

            // 通知
            case 'notifications_broadcast':
                result = await client.notificationsBroadcast(args.item_id);
                break;
            case 'notifications_list':
                result = await client.notificationsList(args || {});
                break;
            case 'notifications_read':
                result = await client.notificationsRead(args || {});
                break;
            case 'notifications_settings':
                result = await client.notificationsSettings(args || {});
                break;

            // エージェント
            case 'agent_upgrade_plan':
                result = await client.agentUpgradePlan(args);
                break;

            // 決済追加
            case 'payment_status':
                result = await client.paymentStatus(args.transaction_id);
                break;
            case 'payment_refund':
                result = await client.paymentRefund(args.transaction_id, args.reason);
                break;

            // Connect
            case 'connect_status':
                result = await client.connectStatus();
                break;
            case 'connect_balance':
                result = await client.connectBalance();
                break;

            // スペック
            case 'specs_chip_list':
                result = await client.specsChipList();
                break;
            case 'specs_chip_detail':
                result = await client.specsChipDetail(args.chip);
                break;
            case 'specs_device_models':
                result = await client.specsDeviceModels();
                break;

            // 統計
            case 'stats_dashboard':
                result = await client.statsDashboard();
                break;

            // ヘルス
            case 'health':
                result = await client.health();
                break;

            // 交渉
            case 'negotiate_offer':
                result = await client.negotiateOffer(args);
                break;
            case 'negotiate_respond':
                result = await client.negotiateRespond(args);
                break;
            case 'negotiate_history':
                result = await client.negotiateHistory(args || {});
                break;

            // JPYC決済 (5)
            case 'jpyc_checkout':
                result = await client.jpycCheckout(args.item_id, args.buyer_wallet_address);
                break;
            case 'jpyc_status':
                result = await client.jpycStatus(args.pending_id);
                break;
            case 'jpyc_payout_status':
                result = await client.jpycPayoutStatus(args.transaction_id);
                break;
            case 'jpyc_wallet_register':
                result = await client.jpycWalletRegister(args.polygon_wallet_address);
                break;
            case 'jpyc_balance':
                result = await client.jpycBalance();
                break;

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
};

server.setRequestHandler(CallToolRequestSchema, handleToolCall);

// ==========================================
// Start server (stdio or HTTP)
// ==========================================

async function main() {
    if (TRANSPORT === 'http') {
        // HTTP transport for VPS deployment
        const { createServer } = await import('http');
        const httpServer = createServer(async (req, res) => {
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', process.env.MACCLAW_CORS_ORIGIN || 'http://127.0.0.1');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // Health check
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', tools: TOOLS.length, version: '1.9.0' }));
                return;
            }

            // SSE endpoint for MCP
            if (req.url === '/sse' || req.url === '/mcp') {
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                });

                const toolsList = TOOLS.map(t => ({ name: t.name, description: t.description }));
                res.write(`data: ${JSON.stringify({ type: 'tools', tools: toolsList })}\n\n`);
                return;
            }

            // JSON-RPC endpoint
            if (req.method === 'POST' && (req.url === '/' || req.url === '/rpc')) {
                const authHeader = req.headers['authorization'] || '';
                const presented = authHeader.replace(/^Bearer\s+/i, '');
                if (!API_KEY || presented !== API_KEY) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unauthorized' }));
                    return;
                }
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const rpcRequest = JSON.parse(body);
                        let rpcResult;

                        if (rpcRequest.method === 'tools/list') {
                            rpcResult = { tools: TOOLS };
                        } else if (rpcRequest.method === 'tools/call') {
                            rpcResult = await handleToolCall({ params: rpcRequest.params });
                        } else {
                            rpcResult = { error: `Unknown method: ${rpcRequest.method}` };
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: rpcRequest.id,
                            result: rpcResult,
                        }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: e.message }));
                    }
                });
                return;
            }

            // 404
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        });

        httpServer.listen(PORT, '127.0.0.1', () => {
            console.error(`[macclaw-mcp] HTTP server listening on port ${PORT}`);
            console.error(`[macclaw-mcp] Health: http://localhost:${PORT}/health`);
            console.error(`[macclaw-mcp] Tools: ${TOOLS.length}`);
        });
    } else {
        // stdio transport for local use
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error(`[macclaw-mcp] Connected via stdio (${TOOLS.length} tools)`);
    }
}

main().catch(console.error);
