// Définitions des commandes slash
export const commands = [
  {
    name: 'todo',
    description: 'Créer une todo et un channel dédié',
    options: [
      {
        name: 'nom',
        description: 'Le nom de la todo',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'task',
    description: 'Créer une tache a la todo courante',
    options: [
      {
        name: 'nom',
        description: 'Le nom de la task',
        type: 3,
        required: true,
      },
    ],
  },
];
