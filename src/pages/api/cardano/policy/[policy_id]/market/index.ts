import type { NextApiRequest, NextApiResponse } from 'next';
import jpgStore from '@/utils/jpgStore';
import type { ApiMarketToken } from '@/@types';

export const config = {
  maxDuration: 300,
  api: {
    responseLimit: false,
  },
};

export interface PolicyMarketListingsResponse {
  policyId: string
  items: ApiMarketToken[]
}

const handler = async (req: NextApiRequest, res: NextApiResponse<PolicyMarketListingsResponse>) => {
  const { method, query } = req;

  const policyId = query.policy_id?.toString();

  if (!policyId) {
    return res.status(400).end();
  }

  try {
    switch (method) {
      case 'GET': {
        const listings = await jpgStore.getListings(policyId, { withAll: true });

        return res.status(200).json({
          policyId,
          items: listings,
        });
      }

      default: {
        res.setHeader('Allow', 'GET');
        return res.status(405).end();
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
};

export default handler;
