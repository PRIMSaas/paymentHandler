import { getAuth } from 'firebase-admin/auth';
import * as functions from 'firebase-functions';
import * as config from './config.js'

import { onRequest } from "firebase-functions/v2/https";
import Stripe from 'stripe';

const admin = require('firebase-admin');

admin.initializeApp();

const stripe = new Stripe(config.STRIPE_API_KEY, {
   appInfo: {
     name: 'DrJimPaymentDemo'
   },
 });
 
export const handleSubscriptionEvents = onRequest(
   async (req: functions.https.Request, resp: any) => {
      const relevantEvents = new Set([
         'customer.subscription.created',
         'customer.subscription.updated'
        ]);
        let event: Stripe.Event;
        try {
         event = stripe.webhooks.constructEvent(
           req.rawBody,
           req.headers['stripe-signature'] ?? "",
           config.STRIPE_WEBHOOK_SIGNATURE
         );
       } catch (error) {
         resp.status(401).send('Webhook Error: Invalid Secret');
         return;
       }
       if (relevantEvents.has(event.type)) {
         const subscription = event.data.object as Stripe.Subscription;
         const stripeCustomer = await stripe.customers.retrieve(subscription.customer.toString())
         if(!stripeCustomer.deleted){
            const customerEmail = stripeCustomer.email ?? ""
            const subscriptionId = subscription.id
            getAuth().getUserByEmail(customerEmail).then((userRecord) => {
               const firestoreCollection = "users/".concat(userRecord.uid).concat("/subscriptionDetails")
               admin.firestore().collection(firestoreCollection).doc(subscriptionId).set({
                  dateEnd: subscription.current_period_end,
                  seatPurchased: subscription.items.data.at(0)?.quantity
               })
            })
         }
      }
      resp.status(200);   
   }
);


exports.setupUser = functions.auth.user().onCreate(async (user) => {
  const currentDate = new Date();
  const futureDate = new Date(currentDate);
  futureDate.setDate(currentDate.getDate() + 30);
  const freeTrialEndInEpoch = Math.floor(futureDate.getTime() / 1000);
  const firestoreCollection = `users/${user.uid}/subscriptionDetails`;
  admin.firestore().collection(firestoreCollection).doc("FREE_TRIAL").set({
      dateEnd: freeTrialEndInEpoch,
  });
  const stripeCustomer = await stripe.customers.create({
    name: user.displayName,
    email: user.email,
  });
  getAuth().setCustomUserClaims(user.uid, {
    stripeId: stripeCustomer.id
  })
  return
})
 
export const createPortalLink = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated!'
    );
  }
 
  try {
    const userRecord = await getAuth().getUser(uid);
    var stripeId = userRecord.customClaims?.['stripeId'];
 
     if (!stripeId) {
      const stripeCustomer = await stripe.customers.create({
        name: userRecord.displayName,
        email: userRecord.email
      }); 
      stripeId = stripeCustomer.id
      getAuth().setCustomUserClaims(uid, {
        'stripeId': stripeCustomer.id
      })
    }

    const stripeCustomer = await stripe.customers.retrieve(stripeId);
 
    if (!stripeCustomer.deleted) {
      const params: Stripe.BillingPortal.SessionCreateParams = {
        customer: stripeCustomer.id,
        return_url: config.STRIPE_RETURN_URL
      };
 
      const session = await stripe.billingPortal.sessions.create(params);
      return session.url;
    } else {
    throw new Error('Customer not found on Stripe\'s system');
    }
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
 });