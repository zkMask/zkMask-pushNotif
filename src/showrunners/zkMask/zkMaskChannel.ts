import { EPNSChannel } from '../../helpers/epnschannel';
import config from '../../config';
import { Logger } from 'winston';
import { Inject, Service } from 'typedi';
import zkMaskSettings from './zkMaskSettings.json';
import axios from 'axios';
import request, { gql } from 'graphql-request';
import {abi} from './abi';
import { ZkMaskModel, IZkMaskData } from './zkMaskModel';
import { latest } from '@pushprotocol/restapi/src/lib/chat';

@Service()
export default class ZkMaskChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'ZkMask',
      url: 'https://github.com/zkMask',
      useOffChain: true,
    });
  }

  async notifyAuthRequest(simulate: any) {
     //  Overide logic if need be
     const logicOverride =
     typeof simulate == 'object'
       ? simulate.hasOwnProperty('logicOverride')
         ? simulate.hasOwnProperty('logicOverride')
         : false
       : false;
     let latestBlockNumber = simulate.logicOverride.mode
        ? simulate.logicOverride.latestBlockNumber
        : await this.getZkMaskDataFromDB();
   //  -- End Override logic

   let { initiateAuthentications} = await request(
      zkMaskSettings.zkMask_subgraph,
      this.fetchAuthRequestData()
    );

    if(latestBlockNumber == null) {
      latestBlockNumber = initiateAuthentications[initiateAuthentications.length - 1].txBlockNumber;
      this.setZkMaskDataInDB({ latestBlockNumber: latestBlockNumber });
    }
    
    for(const authRequest of initiateAuthentications){
      if(authRequest.txBlockNumber > latestBlockNumber) {
        const title = `ZkMask Auth Request`;
      const message = `ZkMask has request for authentication\n [t: Transaction Id:]${authRequest.txId}\n [s: Transaction Block Number:] ${authRequest.txBlockNumber}\n [d: Transaction Timestamp:] ${authRequest.txTimestamp}`;
      const payloadTitle = `ZkMask Auth Request`;
      const payloadMsg = `ZkMask has request for authentication\n [t: Transaction Id:]${authRequest.txId}\n [s: Transaction Block Number:] ${authRequest.txBlockNumber}\n [d: Transaction Timestamp:] ${authRequest.txTimestamp}`;
      const cta = `https://goerli.etherscan.io/tx/${authRequest.transactionHash}`;
      const payload = {
        type: 3, // Type of Notification
        notifTitle: title, // Title of Notification
        notifMsg: message, // Message of Notification
        title: payloadTitle, // Internal Title
        msg: payloadMsg, // Internal Message
        cta: cta, // Call to Action String
      };
      const receipents = simulate.hasOwnProperty('txOverride') && simulate.txOverride.mode
        ? simulate.txOverride.receipents
        : authRequest.user;
      this.sendNotification({
        recipient: receipents,
        title: payload.notifTitle,
        message: payload.notifMsg,
        payloadTitle: payload.title,
        payloadMsg: payload.msg,
        notificationType: payload.type,
        cta: payload.cta,
        image: null,
        simulate: simulate,
      });
      }
    }
    this.setZkMaskDataInDB({ latestBlockNumber: initiateAuthentications[initiateAuthentications.length - 1].txBlockNumber });
  }

  async notifyAuthConfirmation(simulate: any) {
    //  Overide logic if need be
    const logicOverride =
    typeof simulate == 'object'
      ? simulate.hasOwnProperty('logicOverride')
        ? simulate.hasOwnProperty('logicOverride')
        : false
      : false;
    let latestBlockNumber = simulate.logicOverride.mode
       ? simulate.logicOverride.latestBlockNumber
       : await this.getZkMaskDataFromDB();
  //  -- End Override logic

  let { authenticationCompleteds } = await request(
     zkMaskSettings.zkMask_subgraph,
     this.fetchAuthConfirmationData()
   );

   if(latestBlockNumber == null) {
     latestBlockNumber = authenticationCompleteds[authenticationCompleteds.length - 1].txBlockNumber;
     this.setZkMaskDataInDB({ latestBlockNumber: latestBlockNumber });
   }
   
   for(const authRequest of authenticationCompleteds){
     if(authRequest.txBlockNumber > latestBlockNumber) {
       const title = `ZkMask Authorized`;
     const message = authRequest.success
       ? `Your transaction has been authorized by ZkMask\n [t: Transaction Id:]${authRequest.txId}\n [s: Transaction Block Number:] ${authRequest.txBlockNumber}\n [d: Transaction Timestamp:] ${authRequest.txTimestamp}`
       : `Your transaction has been rejected by ZkMask\n [t: Transaction Id:]${authRequest.txId}\n [s: Transaction Block Number:] ${authRequest.txBlockNumber}\n [d: Transaction Timestamp:] ${authRequest.txTimestamp}`;
     const payloadTitle = `ZkMask Authorized`;
     const payloadMsg = authRequest.success
        ? `Your transaction has been authorized by ZkMask\n [t: Transaction Id:]${authRequest.txId}\n [s: Transaction Block Number:] ${authRequest.txBlockNumber}\n [d: Transaction Timestamp:] ${authRequest.txTimestamp}`
        : `Your transaction has been rejected by ZkMask\n [t: Transaction Id:]${authRequest.txId}\n [s: Transaction Block Number:] ${authRequest.txBlockNumber}\n [d: Transaction Timestamp:] ${authRequest.txTimestamp}`;
     const cta = `https://goerli.etherscan.io/tx/${authRequest.transactionHash}`;
     const payload = {
       type: 3, // Type of Notification
       notifTitle: title, // Title of Notification
       notifMsg: message, // Message of Notification
       title: payloadTitle, // Internal Title
       msg: payloadMsg, // Internal Message
       cta: cta, // Call to Action String
     };
     const receipents = simulate.hasOwnProperty('txOverride') && simulate.txOverride.mode
       ? simulate.txOverride.receipents
       : authRequest.user;
     this.sendNotification({
       recipient: receipents,
       title: payload.notifTitle,
       message: payload.notifMsg,
       payloadTitle: payload.title,
       payloadMsg: payload.msg,
       notificationType: payload.type,
       cta: payload.cta,
       image: null,
       simulate: simulate,
     });
     }
   }
   this.setZkMaskDataInDB({ latestBlockNumber: authenticationCompleteds[authenticationCompleteds.length - 1].txBlockNumber });
 }

  async getZkMaskDataFromDB() {
    this.logInfo(`Getting Zkmask Data from DB..`);
    const doc = await ZkMaskModel.findOne({ _id: 'ZKMASK_DATA' });
    this.log("ZkMask Data Fetched Successfully");
    return doc;
  }
  
  async setZkMaskDataInDB(data: IZkMaskData) {
    this.logInfo(`Setting ZkMask DATA to DB %o`);
    await ZkMaskModel.findOneAndUpdate({ _id: 'ZkMask_DATA' }, data, { upsert: true });
     this.logInfo('ZkMask Data Set Successfully');
  }

  private fetchAuthRequestData() {
    return gql`
      query Query {
        initiateAuthentications {
          id
          user
          txId
          methodId
          transactionHash
          txBlockNumber
          txTimestamp
        }
      }
    `;
  }

  private fetchAuthConfirmationData() {
    return gql`
      query Query {
        authenticationCompleteds {
          id
          success
          user
          txId
          contract
          methodId
          transactionHash
          txBlockNumber
          txTimestamp
          value
        }
      }
    `;
  }
}
