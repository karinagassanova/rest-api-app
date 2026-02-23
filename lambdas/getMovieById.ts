import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const movieId = event.pathParameters?.movieId
      ? parseInt(event.pathParameters.movieId)
      : undefined;

    if (!movieId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing movie Id" }),
      };
    }

    // Get movie metadata
    const movieResult = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME, // Movies table
        Key: { id: movieId },
      })
    );

    if (!movieResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Invalid movie Id" }),
      };
    }

    // Base response
    const response: any = {
      data: movieResult.Item,
    };

    // Check if cast=true
    const includeCast =
      event.queryStringParameters?.cast === "true";

    if (includeCast) {
      const castResult = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.CAST_TABLE, // MovieCast table
          KeyConditionExpression: "movieId = :m",
          ExpressionAttributeValues: {
            ":m": movieId,
          },
        })
      );

      response.cast = castResult.Items ?? [];
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response),
    };

  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const client = new DynamoDBClient({
    region: process.env.REGION,
  });
  return DynamoDBDocumentClient.from(client);
}