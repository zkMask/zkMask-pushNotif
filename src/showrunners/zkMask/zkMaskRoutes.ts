import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import ZkMaskChannel from './zkMaskChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/zkMask', route);

  route.post(
    '/notifyAuthRequest',
    celebrate({
      body: Joi.object({
        simulate: Joi.object(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/zkMask/notifyAuthRequest: %o', req.body);
      try {
        const zkMaskChannel = Container.get(ZkMaskChannel);
        const response = await zkMaskChannel.notifyAuthRequest(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
