import { Role, Status } from '@prisma/client';
import prisma from '../src/config/prisma.config';

async function main() {
  console.log("Début du seeding BlockLucky — Ville d'EtherBay...");

  const adminUser = await prisma.user.upsert({
    where: { walletAddress: '0xadmin0000000000000000000000000000etherbay' },
    update: {},
    create: {
      walletAddress: '0xadmin0000000000000000000000000000etherbay',
      email: 'maire@etherbay.fr',
      role: Role.ADMIN,
      isEmailVerified: true,
      pointsBalance: 1000,
    },
  });

  const partnerUser = await prisma.user.upsert({
    where: { walletAddress: '0xpartner00000000000000000000000000etherbay' },
    update: {},
    create: {
      walletAddress: '0xpartner00000000000000000000000000etherbay',
      email: 'boulangerie@etherbay.fr',
      role: Role.PARTNER,
      isEmailVerified: true,
      pointsBalance: 500,
    },
  });

  const citizenUser = await prisma.user.upsert({
    where: { walletAddress: '0xcitizen00000000000000000000000000etherbay' },
    update: {},
    create: {
      walletAddress: '0xcitizen00000000000000000000000000etherbay',
      email: 'citoyen@etherbay.fr',
      role: Role.USER,
      isEmailVerified: true,
      pointsBalance: 250,
      referredById: adminUser.id,
    },
  });

  const round = await prisma.lotteryRound.upsert({
    where: { contractRoundId: 1 },
    update: {},
    create: {
      contractRoundId: 1,
      status: Status.OPEN,
      prizePool: 12.5,
    },
  });

  const boulangerie = await prisma.partner.create({
    data: {
      name: "La Boulangerie du Port d'EtherBay",
      logoUrl: 'https://assets.etherbay.fr/partners/boulangerie.png',
      isActive: true,
      rewards: {
        create: [
          {
            title: '-15% sur les viennoiseries et pains spéciaux',
            costInPoints: 100,
            totalStock: 100,
            remainingStock: 95,
            isActive: true,
          },
          {
            title: 'Une Galette des Rois offerte pour 2 achetées',
            costInPoints: 200,
            totalStock: 50,
            remainingStock: 50,
            isActive: true,
          },
        ],
      },
    },
  });

  const cinema = await prisma.partner.create({
    data: {
      name: 'Cinéma Le Phare EtherBay',
      logoUrl: 'https://assets.etherbay.fr/partners/cinema.png',
      isActive: true,
      rewards: {
        create: [
          {
            title: '1 Place de Cinéma achetée = 1 Place offerte',
            costInPoints: 150,
            totalStock: 200,
            remainingStock: 180,
            isActive: true,
          },
        ],
      },
    },
  });

  console.log('Seeding terminé avec succès :', {
    admin: adminUser.email,
    partnerUser: partnerUser.email,
    citizen: citizenUser.email,
    activeRoundId: round.contractRoundId,
    partners: [boulangerie.name, cinema.name],
  });
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
