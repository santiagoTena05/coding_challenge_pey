const awsConfig = {
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT!,
      region: process.env.NEXT_PUBLIC_APPSYNC_REGION!,
      defaultAuthMode: 'apiKey' as const,
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY!
    }
  }
};

export default awsConfig;