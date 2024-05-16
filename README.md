# Payment Handler for PRIMS

This repository contains the backend code to glue Firebase Authentication, Firestore and Stripe services together. 

### Prerequisites
1. You will need to make sure you have [npm and nodejs](https://nodejs.org/en) installed. 

2. You have signed up for Stripe account. 

3. You have a file named `config.ts` in `functions/src/`
```
# Go here to get your key https://dashboard.stripe.com/test/apikeys
export let STRIPE_API_KEY: string =  "xxxx";

# This signature is taken after you call stripe listen
# See running / deploying the software section below. 
# In a production environment, you can get the key after you add your endpoint
# https://dashboard.stripe.com/test/webhooks
export let STRIPE_WEBHOOK_SIGNATURE: string = "xxxx"

export let STRIPE_RETURN_URL: string = "http://127.0.0.1:5500/public/dashboard.html"
```

4. You have [Stripe CLI](https://docs.stripe.com/stripe-cli) installed

5. You have the Blaze plan for Firebase enabled

### Running / Deploying the software

To build the software, ensure you have npm installed. 
```
cd functions
npm run install
npm run build
```
https://firebase.google.com/docs/functions/get-started?gen=2nd

To deploy the functions to Firebase
```
firebase deploy --only functions
```


### Testing 

To test locally
```
firebase emulators:start

### WARNING ###
### MAKE SURE YOU ARE USING A SANDBOX KEY! ###
stripe login --api-key xxxx

# Change the URL as required
stripe listen --forward-to http://127.0.0.1:5001/drjim-payment-demo/us-central1/handleSubscriptionEvents
```

Use these test cards to mock payment
https://docs.stripe.com/testing#cards
