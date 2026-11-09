import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BlockLucky EtherBay API',
      version: '1.0.0',
      description: 'API Backend officielle de la loterie décentralisée BlockLucky pour la ville d\'EtherBay (Web3, Fidélité, Marketplace, Admin, RGPD).',
      contact: {
        name: 'DSI EtherBay & Epitech Digital School',
        email: 'dsi@etherbay.fr',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Serveur de développement local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/api/**/*.routes.ts', './dist/src/api/**/*.routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
