# Experimental Effection Inspector

Testing some ideas on how one might implement an Inspector tool for Effection v3 in a non-intrusive (ie, completely opt-in) manner.

## Getting Started

Currently, only Node 20.x is directly supported as a runtime. Deno _could_ work, will likely require some Import Map gymnastics.

1. Clone this repo
2. Install dependencies with `npm install`
3. Build backend inspector code and UI with `npm run build`
4. Start the Inspector UI with parcel: `npm exec parcel`

## Usage

1. Pass the `--import /path/to/repo/dist/node.mjs` option to your Node invocation. For example `node --import ~/experimental-effection-inspector/dist/node.mjs my-effection-app.js`
2. Visit the Inspector UI at `http://localhost:8081`

You should now see:

- A Tree representing the hierarchy of Effection operations.
- A slider that allows you to 'time-travel' to a prior point in application execution and update the Tree visualization accordingly.
