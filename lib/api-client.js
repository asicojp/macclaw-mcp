/**
 * Mac Claw REST API Client
 * AI Mac Marketplace
 */

export class MacClawApiClient {
    constructor(apiKey, baseUrl = 'https://macclaw.jp') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    async request(action, params = {}) {
        const url = `${this.baseUrl}/api/mcp.php`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, params }),
        });

        const json = await response.json();
        if (!response.ok || !json.success) {
            throw new Error(json.message || `API error: ${response.status}`);
        }
        return json.data;
    }

    // ==========================================
    // 商品 (8)
    // ==========================================

    async itemsList(params) { return this.request('items.list', params); }
    async itemsGet(id) { return this.request('items.get', { id }); }
    async itemsSearch(query, params = {}) { return this.request('items.search', { query, ...params }); }
    async itemsCreate(data) { return this.request('items.create', data); }
    async itemsUpdate(id, data) { return this.request('items.update', { id, ...data }); }
    async itemsPublish(id) { return this.request('items.publish', { id }); }
    async itemsCancel(id) { return this.request('items.cancel', { id }); }
    async itemsSelfList(data) { return this.request('items.self_list', data); }

    // ==========================================
    // 相場 (5)
    // ==========================================

    async marketPriceRange(params = {}) { return this.request('market.price_range', params); }
    async marketRecentSales(params = {}) { return this.request('market.recent_sales', params); }
    async marketPriceSuggest(params) { return this.request('market.price_suggest', params); }
    async marketRetailCompare(params) { return this.request('market.retail_compare', params); }
    async marketDemandScore(itemId) { return this.request('market.demand_score', { item_id: itemId }); }

    // ==========================================
    // 決済 (4)
    // ==========================================

    async checkoutCreate(itemId) { return this.request('checkout.create', { item_id: itemId }); }
    async checkoutSetup(params = {}) { return this.request('checkout.setup', params); }
    async checkoutAgentPay(params = {}) { return this.request('checkout.agent_pay', params); }
    async checkoutPaymentMethods() { return this.request('checkout.payment_methods'); }

    // ==========================================
    // 取引 (4)
    // ==========================================

    async transactionsList(params = {}) { return this.request('transactions.list', params); }
    async transactionsGet(id) { return this.request('transactions.get', { id }); }
    async transactionsShip(id, trackingNumber) { return this.request('transactions.ship', { id, tracking_number: trackingNumber }); }
    async transactionsDispute(transactionId, reason) { return this.request('transactions.dispute', { transaction_id: transactionId, reason }); }

    // ==========================================
    // メッセージ (2)
    // ==========================================

    async messagesList(transactionId) { return this.request('messages.list', { transaction_id: transactionId }); }
    async messagesSend(transactionId, body) { return this.request('messages.send', { transaction_id: transactionId, body }); }

    // ==========================================
    // ユーザー (3)
    // ==========================================

    async usersMe() { return this.request('users.me'); }
    async usersGet(id) { return this.request('users.get', { id }); }
    async usersUpdateProfile(data) { return this.request('users.update_profile', data); }
    async usersRegisterKey(data) { return this.request('users.register_key', data); }

    // ==========================================
    // ソーシャル (3)
    // ==========================================

    async socialLike(itemId) { return this.request('social.like', { item_id: itemId }); }
    async socialComment(itemId, body) { return this.request('social.comment', { item_id: itemId, body }); }
    async socialFollow(userId) { return this.request('social.follow', { user_id: userId }); }

    // ==========================================
    // レビュー (2)
    // ==========================================

    async reviewsList(params = {}) { return this.request('reviews.list', params); }
    async reviewsPost(transactionId, rating, comment) { return this.request('reviews.post', { transaction_id: transactionId, rating, comment }); }

    // ==========================================
    // ウォッチ (5)
    // ==========================================

    async watchCreate(data) { return this.request('watch.create', data); }
    async watchList() { return this.request('watch.list'); }
    async watchDelete(id) { return this.request('watch.delete', { id }); }
    async watchCheck() { return this.request('watch.check'); }
    async watchMatches(params = {}) { return this.request('watch.matches', params); }

    // ==========================================
    // 検品 (3)
    // ==========================================

    async inspectSubmit(data) { return this.request('inspect.submit', data); }
    async inspectGet(itemId) { return this.request('inspect.get', { item_id: itemId }); }
    async inspectChallenge(itemId) { return this.request('inspect.challenge', { item_id: itemId }); }

    // ==========================================
    // 通知 (3)
    // ==========================================

    async notificationsBroadcast(itemId) { return this.request('notifications.broadcast', { item_id: itemId }); }
    async notificationsList(params = {}) { return this.request('notifications.list', params); }
    async notificationsRead(params = {}) { return this.request('notifications.read', params); }
    async notificationsSettings(params = {}) { return this.request('notifications.settings', params); }

    // ==========================================
    // エージェント (1)
    // ==========================================

    async agentUpgradePlan(params) { return this.request('agent.upgrade_plan', params); }

    // ==========================================
    // 決済追加 (2)
    // ==========================================

    async paymentStatus(transactionId) { return this.request('payment.status', { transaction_id: transactionId }); }
    async paymentRefund(transactionId, reason) { return this.request('payment.refund', { transaction_id: transactionId, reason }); }

    // ==========================================
    // Connect (2)
    // ==========================================

    async connectStatus() { return this.request('connect.status'); }
    async connectBalance() { return this.request('connect.balance'); }

    // ==========================================
    // スペック (3)
    // ==========================================

    async specsChipList() { return this.request('specs.chip_list'); }
    async specsChipDetail(chip) { return this.request('specs.chip_detail', { chip }); }
    async specsDeviceModels() { return this.request('specs.device_models'); }

    // ==========================================
    // 統計 (1)
    // ==========================================

    async statsDashboard() { return this.request('stats.dashboard'); }

    // ==========================================
    // 交渉 (3)
    // ==========================================

    async negotiateOffer(params) { return this.request('negotiate.offer', params); }
    async negotiateRespond(params) { return this.request('negotiate.respond', params); }
    async negotiateHistory(params = {}) { return this.request('negotiate.history', params); }

    // ==========================================
    // JPYC決済 (5)
    // ==========================================

    async jpycCheckout(itemId, buyerWallet) { return this.request('jpyc.checkout', { item_id: itemId, buyer_wallet_address: buyerWallet }); }
    async jpycStatus(pendingId) { return this.request('jpyc.status', { pending_id: pendingId }); }
    async jpycPayoutStatus(txId) { return this.request('jpyc.payout_status', { transaction_id: txId }); }
    async jpycWalletRegister(address) { return this.request('jpyc.wallet_register', { polygon_wallet_address: address }); }
    async jpycBalance() { return this.request('jpyc.balance'); }

    // ==========================================
    // ヘルス (認証不要)
    // ==========================================

    async health() {
        const url = `${this.baseUrl}/api/mcp.php`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'health' }),
        });
        return response.json();
    }
}
