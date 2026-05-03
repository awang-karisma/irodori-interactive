## Usage

```bash
$ npm install # or pnpm install or yarn install
```

### Configuration

Create a `.env` file in the root directory to configure environment variables:

```bash
# CORS proxy for asset downloads (optional)
# If assets are served from different domains and CORS is an issue, set this to a CORS proxy URL
# Example: VITE_CORS_PROXY=https://cors.dev/
VITE_CORS_PROXY=
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

Learn more about deploying your application with the [documentations](https://vite.dev/guide/static-deploy.html)
