import {getAuctionByID} from './getAuction';
import {uploadPictureToS3} from '../lib/uploadPictureToS3';
import {setAuctionPictureUrl} from '../lib/setAuctionPictureUrl';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import validator from '@middy/validator';
import createError from 'http-errors';
import uploadAuctionPictureSchema from '../lib/schemas/uploadAuctionPictureSchema';
import cors from '@middy/http-cors';

export async function uploadAuctionPicture(event){
    let updatedAuction;
    const {id} = event.pathParameters;
    const {email} = event.requestContext.authorizer;
    const auction = await getAuctionByID(id);
    //validate auction owner
    if(auction.seller !== email){
        throw new createError.Forbidden(`You are not the seller of this auction!`);
    }

    const base64 = event.body.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    try{
        const pictureUrl = await uploadPictureToS3(auction.id + '.jpg', buffer);
        updatedAuction = await setAuctionPictureUrl(auction.id, pictureUrl);
    } catch(error){
        console.log(error);
        throw new createError.InternalServerError(error);
    }
    return{
        statusCode:200,
        body: JSON.stringify(updatedAuction),
    };
}

export const handler = middy(uploadAuctionPicture)
 .use(httpErrorHandler())
 .use(validator({ inputSchema: uploadAuctionPictureSchema}))
 .use(cors());