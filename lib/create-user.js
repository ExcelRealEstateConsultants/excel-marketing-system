require("dotenv").config();

const prisma = require("./prisma");
const { hashPassword } = require("./auth");

async function main() {
  const email = "jeff@excelrealestateconsultants.com";
  const password = "Excel2026$";
  const firstName = "Jeff";
  const lastName = "Peterson";

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("User already exists:", email);
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: "admin",
    },
  });

  console.log("Created user:", {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
