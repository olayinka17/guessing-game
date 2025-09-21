const Session = require("./model/gameSession");
const Guess = require("./model/guess");
const User = require("./model/user");
const Hosted = require('./model/hostedGame')


class GameSessionService {

  async createSession(data, playerId) {
    const session = await Session.create({
      game_master_id: playerId,
      game_code: data.hosted.code,
      players: [playerId],
    });

    return {
      status: "success",
      data: {
        session,
      },
    };
  }

  async createQuestion(data, sessionId) {
    const session = await Session.findOne({ game_code: sessionId });
    if (!session) {
      return { status: "fail", message: "no session with that code " };
    }
    if (session.status !== "waiting") {
      return {
        status: "fail",
        message: "can only create a question for a waiting session",
      };
    }
    if (session.players.length < 2) {
      return {
        status: "fail",
        message:
          "there must be more than two players before you can create a question and start the game.",
      };
    }
    session.question = data.question;
    session.answer = data.answer;
    session.status = "active";
    await session.save();


    return {
      status: "success",
      data: {
        session,
      },
    };
  }

  async guessAnswer(data, sessionId, playerId) {
    const session = await Session.findOne({ game_code: sessionId });
    if (!session)
      return { status: "fail", message: "no session with that code " };

    const guess = await Guess.findOne({
      player_id: playerId,
      session_code: sessionId,
    });

    const player = await User.findOne({ _id: playerId });

    if (!player || !guess)
      return { status: "fail", message: "inavlid player or guess" };

    if (session.status !== "active") {
      return { status: "fail", message: "Game not active." };
    }

    if (!session.players.includes(playerId))
      return {
        status: "fail",
        message: "The player does not belong to this session",
      };

    if (guess.retry === 0)
      return {
        status: "fail",
        message:
          "you have attempted thrice for this question. wait for the next question.",
      };

    if (session.winner_id === null)
      return {
        status: "fail",
        message:
          "the answer for this question has been declared. wait for the next question.",
      };

    if (session.game_master_id.toString() === playerId) {
      return {
        status: "fail",
        message:
          "Sorry you can't answer this question you are the game master for this round.",
      };
    }

    if (data.guess.toLowerCase() === session.answer.toLowerCase()) {
      // todo: change this to redis

      session.winner_id = playerId;
      guess.guessed_answer = data.guess;
      guess.is_correct = true;
      player.score += 10;

      await Promise.all([session.save(), guess.save(), player.save()]);
      return {
        status: "success",
        data: { answer: data.guess, player, session },
      };
    }

    guess.retry -= 1;
    guess.is_correct = false;
    await guess.save();



    return {
      status: "fail",
      data: {
        attempts: guess.retry,
        session,
      },
    };
  }

  async emitScores(sessionId) {
    const session = await Session.findOne({ game_code: sessionId }).populate({
      path: "players",
      select: "username score",
    });
    if (!session) {
      return { status: "fail", message: "no session with that code " };
    }

    return {
      status: "success",
      data: {
        session,
      },
    };
  }

  async endRound(sessionId) {
    const session = await Session.findOne({ game_code: sessionId }).populate({
      path: "game_master_id",
      select: "username",
    });

    if (!session) {
      return { status: "fail", message: "no session with that code " };
    }
    if (session.status !== "active") {
      return { status: "fail", message: "Session not active." };
    }
    let nextGameMaster;

    if (session.winner_id) {
      nextGameMaster = session.winner_id;
    } else {
      const players = session.players;

      if (!players || players.length === 0) {
        return {
          status: "fail",
          message: "no players to assign as game master ",
        };
      }
      nextGameMaster = players[Math.floor(Math.random() * players.length)];
    }

    session.game_master_id = nextGameMaster;

    session.answer = undefined;
    session.question = undefined;
    session.status = "waiting";
    session.winner_id = undefined;
    await session.save();
    await Guess.updateMany(
      { session_code: sessionId },
      { $set: { retry: 3, is_correct: false, guessed_answer: null } }
    );
    return {
      status: "sucesss",
      data: {
        session,
      },
    };
  }

  async join(sessionId, playerId) {
    const session = await Session.findOne({ game_code: sessionId });

    if (!session) {
      return { status: "fail", message: "no session with that code " };
    }
    if (session.status === "active") {
      return { status: "fail", message: "game has started." };
    }
    const guess = await Guess.create({
      player_id: playerId,
      session_code: sessionId,
    });

    session.players.push(playerId);
    await session.save();
    return {
      status: "success",
      data: {
        session,
        guess,
      },
    };
  }

  async exit(sessionId, playerId) {
    const updatedSession = await Session.findOneAndUpdate(
      { game_code: sessionId },
      { $pull: { players: playerId } },
      { new: true }
    );

    if (!updatedSession)
      return { status: "fail", message: "no session with that code " };

    if (updatedSession.players.length === 0) {
      await Session.deleteOne({ _id: updatedSession._id });
      await Promise.all([
        Guess.deleteMany({ session_code: sessionId }),
        User.deleteOne({ _id: playerId }),
        Hosted.deleteOne({code: sessionId})
      ]);
      return {
        status: "success",
        data: {
          session_deleted: true,
        },
      };
    }

    await Promise.all([
      Guess.deleteOne({ player_id: playerId }),
      User.deleteOne({ _id: playerId }),
    ]);
    return {
      status: "success",
      data: {
        session_deleted: false,
        updatedSession,
      },
    };
  }
}

module.exports = GameSessionService;
