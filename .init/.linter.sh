#!/bin/bash
cd /home/kavia/workspace/code-generation/treasure-snake-game-1417-1426/snake_game_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

