import { FastifyPluginAsync } from 'fastify';

export const wellKnownRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/.well-known/openid-configuration', async () => {
    return {
      issuer: 'http://localhost:3000',
      authorization_endpoint: 'http://localhost:3000/authorize',
      token_endpoint: 'http://localhost:3000/token',
      userinfo_endpoint: 'http://localhost:3000/userinfo',
      end_session_endpoint: 'http://localhost:3000/logout',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
    };
  });
};
