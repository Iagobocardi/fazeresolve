const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        unique: true,
    },
    planId: {
        type: String,
        required: true,
    },
    subscriptionId: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'authorized', 'paused', 'cancelled'],
    },
    lastPaymentDate: {
        type: Date,
    },
    nextPaymentDate: {
        type: Date,
    },
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
