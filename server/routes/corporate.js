// ========================================
// Corporate Account Routes
// ========================================

const express = require('express');
const router = express.Router();
const CorporateAccount = require('../models/CorporateAccount');
const corporatePricingService = require('../services/corporatePricingService');

// Middleware to authenticate corporate API requests
const authenticateCorporateApi = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    try {
        const account = await CorporateAccount.findByApiKey(apiKey);
        if (!account) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Check IP whitelist if configured
        if (account.apiAccess.allowedIPs && account.apiAccess.allowedIPs.length > 0) {
            const clientIP = req.ip || req.connection.remoteAddress;
            if (!account.apiAccess.allowedIPs.includes(clientIP)) {
                return res.status(403).json({ error: 'IP not whitelisted' });
            }
        }

        req.corporateAccount = account;
        next();
    } catch (error) {
        console.error('[Corporate] Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// ========================================
// Public Routes
// ========================================

// Get pricing tiers info (public)
router.get('/tiers', (req, res) => {
    try {
        const tiers = corporatePricingService.getTierInfo();
        res.json({ success: true, tiers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get quote (requires account ID)
router.post('/quote', async (req, res) => {
    try {
        const { corporateAccountId, zone, vehicleClass, extras, pickupTime, passengers, luggage } = req.body;

        if (!zone) {
            return res.status(400).json({ error: 'Zone is required' });
        }

        const pricing = await corporatePricingService.calculateCorporatePrice({
            corporateAccountId,
            zone,
            vehicleClass,
            extras,
            pickupTime,
            passengers,
            luggage
        });

        res.json({ success: true, quote: pricing });
    } catch (error) {
        console.error('[Corporate] Quote error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Request corporate account (signup)
router.post('/request', async (req, res) => {
    try {
        const {
            companyName,
            legalName,
            registrationNumber,
            taxId,
            industry,
            contactName,
            contactEmail,
            contactPhone,
            contactPosition,
            address,
            estimatedMonthlyTrips,
            notes
        } = req.body;

        // Validation
        if (!companyName || !contactName || !contactEmail || !contactPhone) {
            return res.status(400).json({
                error: 'Company name and contact details are required'
            });
        }

        // Check for existing account
        const existing = await CorporateAccount.findOne({
            'contact.primary.email': contactEmail.toLowerCase()
        });

        if (existing) {
            return res.status(409).json({
                error: 'An account request already exists for this email'
            });
        }

        // Create account request
        const account = new CorporateAccount({
            company: {
                name: companyName,
                legalName,
                registrationNumber,
                taxId,
                industry: industry || 'corporate'
            },
            contact: {
                primary: {
                    name: contactName,
                    email: contactEmail.toLowerCase(),
                    phone: contactPhone,
                    position: contactPosition
                }
            },
            address: address || {},
            status: 'pending',
            notes: notes || `Estimated monthly trips: ${estimatedMonthlyTrips || 'Not specified'}`
        });

        // Auto-determine initial tier based on estimated volume
        if (estimatedMonthlyTrips >= 100) {
            account.pricingTier = 'platinum';
        } else if (estimatedMonthlyTrips >= 30) {
            account.pricingTier = 'gold';
        } else if (estimatedMonthlyTrips >= 10) {
            account.pricingTier = 'silver';
        }

        await account.save();

        res.status(201).json({
            success: true,
            message: 'Corporate account request submitted successfully',
            accountId: account.accountId,
            status: 'pending'
        });

    } catch (error) {
        console.error('[Corporate] Request error:', error);
        res.status(500).json({ error: 'Failed to submit account request' });
    }
});

// ========================================
// Authenticated Corporate Routes
// ========================================

// Get account details
router.get('/account', authenticateCorporateApi, async (req, res) => {
    try {
        const account = req.corporateAccount;

        res.json({
            success: true,
            account: {
                id: account.accountId,
                company: account.company,
                contact: account.contact,
                pricingTier: account.pricingTier,
                pricing: {
                    discountPercentage: account.pricing.discountPercentage,
                    volumeDiscounts: account.pricing.volumeDiscounts
                },
                billing: {
                    method: account.billing.method,
                    currency: account.billing.currency,
                    currentBalance: account.billing.currentBalance,
                    creditLimit: account.billing.creditLimit,
                    paymentTerms: account.billing.paymentTerms
                },
                stats: account.stats,
                status: account.status
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pricing for authenticated account
router.post('/pricing', authenticateCorporateApi, async (req, res) => {
    try {
        const { zone, vehicleClass, extras, pickupTime, passengers, luggage } = req.body;

        if (!zone) {
            return res.status(400).json({ error: 'Zone is required' });
        }

        const pricing = await corporatePricingService.calculateCorporatePrice({
            corporateAccountId: req.corporateAccount._id,
            zone,
            vehicleClass,
            extras,
            pickupTime,
            passengers,
            luggage
        });

        res.json({ success: true, pricing });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate bulk quote
router.post('/bulk-quote', authenticateCorporateApi, async (req, res) => {
    try {
        const { bookings } = req.body;

        if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
            return res.status(400).json({ error: 'Bookings array is required' });
        }

        const quote = await corporatePricingService.generateCorporateQuote(
            req.corporateAccount._id,
            bookings
        );

        res.json({ success: true, quote });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly statement
router.get('/statement/:year/:month', authenticateCorporateApi, async (req, res) => {
    try {
        const { year, month } = req.params;

        const statement = await corporatePricingService.generateMonthlyStatement(
            req.corporateAccount._id,
            parseInt(year),
            parseInt(month)
        );

        res.json({ success: true, statement });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add balance (for prepaid accounts)
router.post('/add-balance', authenticateCorporateApi, async (req, res) => {
    try {
        const { amount, paymentMethod, reference } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const account = req.corporateAccount;
        await account.addBalance(amount);

        res.json({
            success: true,
            message: `$${amount} added to account balance`,
            newBalance: account.billing.currentBalance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get volume recommendations
router.get('/recommendations', authenticateCorporateApi, async (req, res) => {
    try {
        const account = req.corporateAccount;
        const recommendations = corporatePricingService.getVolumeRecommendations(
            account.stats.monthlyBookings,
            account.pricingTier
        );

        res.json({ success: true, recommendations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List account users
router.get('/users', authenticateCorporateApi, async (req, res) => {
    try {
        const account = req.corporateAccount;

        res.json({
            success: true,
            users: account.users.map(u => ({
                email: u.email,
                role: u.role,
                permissions: u.permissions,
                addedAt: u.addedAt
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add user to account
router.post('/users', authenticateCorporateApi, async (req, res) => {
    try {
        const { email, role, permissions } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const account = req.corporateAccount;

        // Check if user already exists
        if (account.users.find(u => u.email === email.toLowerCase())) {
            return res.status(409).json({ error: 'User already exists in this account' });
        }

        account.users.push({
            email: email.toLowerCase(),
            role: role || 'booker',
            permissions: permissions || {
                canBook: true,
                canViewAllBookings: false,
                canApproveBookings: false,
                canManageUsers: false,
                canViewReports: false,
                canManageBilling: false
            }
        });

        await account.save();

        res.json({
            success: true,
            message: 'User added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove user from account
router.delete('/users/:email', authenticateCorporateApi, async (req, res) => {
    try {
        const { email } = req.params;
        const account = req.corporateAccount;

        account.users = account.users.filter(u => u.email !== email.toLowerCase());
        await account.save();

        res.json({
            success: true,
            message: 'User removed successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Admin Routes (would need admin auth)
// ========================================

// List all corporate accounts (admin only)
router.get('/admin/accounts', async (req, res) => {
    try {
        // TODO: Add admin authentication
        const { status, tier, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (tier) query.pricingTier = tier;

        const accounts = await CorporateAccount.find(query)
            .select('accountId company.name pricingTier status stats.totalBookings stats.totalSpent createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await CorporateAccount.countDocuments(query);

        res.json({
            success: true,
            accounts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve/activate corporate account (admin only)
router.post('/admin/accounts/:accountId/approve', async (req, res) => {
    try {
        // TODO: Add admin authentication
        const { accountId } = req.params;
        const { pricingTier, customDiscount, creditLimit } = req.body;

        const account = await CorporateAccount.findOne({ accountId });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        account.status = 'active';
        account.verified = true;
        account.verifiedAt = new Date();

        if (pricingTier) account.pricingTier = pricingTier;
        if (customDiscount !== undefined) account.pricing.discountPercentage = customDiscount;
        if (creditLimit !== undefined) account.billing.creditLimit = creditLimit;

        // Generate API key
        await account.generateApiKey();
        await account.save();

        res.json({
            success: true,
            message: 'Account approved successfully',
            apiKey: account.apiAccess.apiKey
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update corporate account pricing (admin only)
router.put('/admin/accounts/:accountId/pricing', async (req, res) => {
    try {
        // TODO: Add admin authentication
        const { accountId } = req.params;
        const { pricingTier, discountPercentage, volumeDiscounts, customRates, vehicleRates } = req.body;

        const account = await CorporateAccount.findOne({ accountId });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (pricingTier) account.pricingTier = pricingTier;
        if (discountPercentage !== undefined) account.pricing.discountPercentage = discountPercentage;
        if (volumeDiscounts) account.pricing.volumeDiscounts = volumeDiscounts;
        if (customRates) account.pricing.customRates = customRates;
        if (vehicleRates) account.pricing.vehicleRates = vehicleRates;

        await account.save();

        res.json({
            success: true,
            message: 'Pricing updated successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
