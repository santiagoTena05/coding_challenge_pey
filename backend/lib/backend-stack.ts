import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import { Construct } from 'constructs';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table - exactly like in your console
    const notesTable = new dynamodb.Table(this, 'NotesTable', {
      tableName: 'Notes',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
    });

    // AppSync GraphQL API - exactly like in your console
    const api = new appsync.GraphqlApi(this, 'NotesApi', {
      name: 'notes-sentiment-api',
      schema: appsync.SchemaFile.fromAsset('./lib/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365))
          }
        }
      },
      xrayEnabled: false, // Matches your config
    });

    // DynamoDB Data Source
    const notesDataSource = api.addDynamoDbDataSource('NotesDynamoDBDataSource', notesTable);

    // Create Note Resolver - converted from your JavaScript resolver to VTL
    notesDataSource.createResolver('CreateNoteResolver', {
      typeName: 'Mutation',
      fieldName: 'createNote',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "id": $util.dynamodb.toDynamoDBJson($util.autoUlid())
          },
          "attributeValues": {
            "text": $util.dynamodb.toDynamoDBJson($ctx.args.text),
            "sentiment": $util.dynamodb.toDynamoDBJson($ctx.args.sentiment),
            "dateCreated": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    // Get Notes Resolver - converted from your JavaScript resolver to VTL
    notesDataSource.createResolver('GetNotesResolver', {
      typeName: 'Query',
      fieldName: 'getNotes',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($limit = 10)
        #if($ctx.args.limit)
          #set($limit = $ctx.args.limit)
        #end

        {
          "version": "2017-02-28",
          "operation": "Scan",
          "limit": $limit,
          #if($ctx.args.nextToken)
            "nextToken": "$ctx.args.nextToken",
          #end
          #if($ctx.args.sentiment)
            "filter": {
              "expression": "sentiment = :sentiment",
              "expressionValues": {
                ":sentiment": $util.dynamodb.toDynamoDBJson($ctx.args.sentiment)
              }
            }
          #end
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($items = [])
        #foreach($item in $ctx.result.items)
          #set($newItem = {})
          #set($newItem.id = $item.id)
          #set($newItem.text = $item.text)
          #set($newItem.dateCreated = $item.dateCreated)
          ## Convert sentiment to lowercase
          #if($item.sentiment)
            #set($newItem.sentiment = $item.sentiment.toLowerCase())
          #else
            #set($newItem.sentiment = $item.sentiment)
          #end
          #set($addItem = $items.add($newItem))
        #end

        {
          "items": $items,
          "nextToken": #if($ctx.result.nextToken)"$ctx.result.nextToken"#else null #end,
          "scannedCount": #if($ctx.result.scannedCount)$ctx.result.scannedCount #else 0 #end
        }
      `)
    });

    // Outputs for easy reference
    new cdk.CfnOutput(this, 'GraphQLApiEndpoint', {
      value: api.graphqlUrl,
      description: 'GraphQL API endpoint'
    });

    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: api.apiKey!,
      description: 'GraphQL API key'
    });

    new cdk.CfnOutput(this, 'GraphQLApiId', {
      value: api.apiId,
      description: 'GraphQL API ID'
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: notesTable.tableName,
      description: 'DynamoDB table name'
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region'
    });
  }
}
