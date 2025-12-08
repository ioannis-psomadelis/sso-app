import { FastifyPluginAsync } from 'fastify';

const IDP_URL = process.env.IDP_URL || 'http://localhost:3000';

export const wellKnownRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/.well-known/openid-configuration', async () => {
    return {
      issuer: IDP_URL,
      authorization_endpoint: `${IDP_URL}/authorize`,
      token_endpoint: `${IDP_URL}/token`,
      userinfo_endpoint: `${IDP_URL}/userinfo`,
      end_session_endpoint: `${IDP_URL}/logout`,
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
