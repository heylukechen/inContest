//show the competiiton with users' newest portoflio.
const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

const isLoggedIn = require("../middleware/isLoggedIn");
const Portfolio = require("../models/Portfolio.model");
const Competition = require("../models/Competition.model");
const User = require("../models/User.model");

router.get("/competition", isLoggedIn, (req, res, next) => {
  Competition.find()
    .populate("portfolio")
    .sort({ totalReturn: -1 })
    .then((allCompetition) => {
      console.log("allCompetition", allCompetition);
      console.log("allCompetition", allCompetition[0].portfolio);
      res.render("competition/all-competitions", { allCompetition });
    })
    .catch((err) => console.log(err));
});

router.get("/competition/:competitionId", isLoggedIn, (req, res, next) => {
  const id = req.params.competitionId;
  Competition.findById(id)
    .populate({ path: "portfolio", populate: { path: "createdBy" } })
    .then((foundCompetition) => {
      console.log("foundCompetition", foundCompetition.createdBy);
      let isOwner = false;
      if (foundCompetition.createdBy == req.session.currentUser._id) {
        isOwner = true;
      } else {
        isOwner = false;
      }
      //   console.log(foundCompetition.portfolio);
      const portfolio = foundCompetition.portfolio;
      res.render("competition/competition-detail", {
        foundCompetition,
        portfolio,
        isOwner,
      });
    })
    .catch((err) => console.log(err));
});

router.post(
  "/competition/:competitionId/sync",
  isLoggedIn,
  (req, res, next) => {
    const id = req.params.competitionId;
    Competition.findOne({ _id: id })
      .then((foundCompetition) => {
        const userGroupIds = foundCompetition.usersInGroup;
        Portfolio.aggregate([
          {
            $match: {
              createdBy: { $in: userGroupIds },
            },
          },
          {
            $sort: {
              referenceDate: -1,
            },
          },
          {
            $group: {
              _id: "$createdBy",
              latestReferenceDate: { $first: "$referenceDate" },
              portfolioId: { $first: "$_id" },
              totalAccount: { $first: "$totalAccount" },
              totalPortfolio: { $first: "$totalPortfolio" },
              totalResult: { $first: "$totalResult" },
              totalReturn: { $first: "$totalReturn" },
              percentageReturn: { $first: "$percentageReturn" },
            },
          },
        ]).then((foundPortfolio) => {
          const portfolioIds = foundPortfolio.map(
            (result) => result.portfolioId
          );
          Competition.findByIdAndUpdate(id, {
            portfolio: portfolioIds,
          })
            .then(res.redirect(`/competition/${req.params.competitionId}`))
            .catch();
        });
      })
      .catch((err) => console.log(err));
  }
);

router.get("/competition/:competitionId/edit", isLoggedIn, (req, res, next) => {
  const id = req.params.competitionId;
  Competition.findById(id)
    .populate("usersInGroup")
    .then((foundCompetition) => {
      User.find().then((allUsers) => {
        // console.log(allUsers);
        // console.log(foundCompetition.usersInGroup);

        const allUsersNames = allUsers.map((item) => item.username);
        // console.log(allUsersNames);
        const allSelectedNames = foundCompetition.usersInGroup.map(
          (item) => item.username
        );
        // console.log(allSelectedNames);

        const newUserArray = [];
        for (let i = 0; i < allUsersNames.length; i++) {
          if (allSelectedNames.includes(allUsersNames[i])) {
            newUserArray.push({
              username: allUsersNames[i],
              isSelected: true,
              _id: allUsers[i]._id,
            });
          } else {
            newUserArray.push({
              username: allUsersNames[i],
              isSelected: false,
              _id: allUsers[i]._id,
            });
          }
        }

        // console.log(newUserArray);
        //allUsers.username => non-selected
        //foundCompetition.usersInGroup.username => selected

        res.render("competition/edit-competition", {
          foundCompetition,
          newUserArray,
        });
      });
    })
    .catch((err) => console.log(err));
});

router.post(
  "/competition/:competitionId/edit",
  isLoggedIn,
  (req, res, next) => {
    const { name, description, userGroup } = req.body;
    const userGroupIds = userGroup.map((id) => new mongoose.Types.ObjectId(id));
    Portfolio.aggregate([
      {
        $match: {
          createdBy: { $in: userGroupIds },
        },
      },
      {
        $sort: {
          referenceDate: -1,
        },
      },
      {
        $group: {
          _id: "$createdBy",
          latestReferenceDate: { $first: "$referenceDate" },
          portfolioId: { $first: "$_id" },
          totalAccount: { $first: "$totalAccount" },
          totalPortfolio: { $first: "$totalPortfolio" },
          totalResult: { $first: "$totalResult" },
          totalReturn: { $first: "$totalReturn" },
          percentageReturn: { $first: "$percentageReturn" },
        },
      },
    ])
      .then((results) => {
        const portfolioIds = results.map((result) => result.portfolioId);
        Competition.findByIdAndUpdate(req.params.competitionId, {
          name: name,
          competitionDescription: description,
          usersInGroup: userGroupIds,
          portfolio: portfolioIds,
        })
          .then(res.redirect(`/competition/${req.params.competitionId}`))
          .catch();
      })
      .catch((err) => console.log(err));
  }
);

router.get("/new-competition", isLoggedIn, (req, res, next) => {
  User.find()
    .then((allUsers) => {
      res.render("competition/new-competition", { allUsers });
    })
    .catch((err) => console.log(err));
});

router.post("/new-competition", isLoggedIn, (req, res, next) => {
  const { name, description, userGroup } = req.body;
  const currentUser = req.session.currentUser;
  const userGroupIds = userGroup.map((id) => new mongoose.Types.ObjectId(id));

  const currentUserNewId = new mongoose.Types.ObjectId(currentUser._id);
  //mongoose push and set(push stuff into an array if its unique) method,
  Portfolio.aggregate([
    {
      $match: {
        createdBy: { $in: userGroupIds },
      },
    },
    {
      $sort: {
        referenceDate: -1,
      },
    },
    {
      $group: {
        _id: "$createdBy",
        latestReferenceDate: { $first: "$referenceDate" },
        portfolioId: { $first: "$_id" },
        totalAccount: { $first: "$totalAccount" },
        totalPortfolio: { $first: "$totalPortfolio" },
        totalResult: { $first: "$totalResult" },
        totalReturn: { $first: "$totalReturn" },
        percentageReturn: { $first: "$percentageReturn" },
      },
    },
  ])
    .then((results) => {
      const portfolioIds = results.map((result) => result.portfolioId);

      Competition.create({
        name: name,
        competitionDescription: description,
        createdBy: currentUserNewId,
        usersInGroup: userGroupIds,
        portfolio: portfolioIds,
      })
        .then(() => {
          res.redirect("/competition");
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      console.error(err);
    });
});

router.post("/competition/:competitionId/delete", (req, res, next) => {
  Competition.findByIdAndRemove(req.params.competitionId)
    .then(() => {
      res.redirect("/competition");
    })
    .catch((err) => console.log(err));
});

module.exports = router;
