import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { authRouter } from "../modules/auth/auth.routes";
import { clinicianAdminRouter } from "../modules/clinician-admin/clinician-admin.routes";
import { clinicianRouter } from "../modules/clinician/clinician.routes";
import { consentRouter } from "../modules/consent/consent.routes";
import { feedbackRouter } from "../modules/feedback/feedback.routes";
import { immunisationsRouter } from "../modules/immunisations/immunisation.routes";
import { pregnancyRouter } from "../modules/pregnancy/pregnancy.routes";
import { profileRouter } from "../modules/profile/profile.routes";
import { screeningsRouter } from "../modules/screenings/screening.routes";
import { walletRouter } from "../modules/wallet/wallet.routes";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "CheckUpp API online",
    data: {
      version: "v1",
    },
  });
});

apiRouter.use(authRouter);
apiRouter.use(authenticate);
apiRouter.use(profileRouter);
apiRouter.use(walletRouter);
apiRouter.use(feedbackRouter);
apiRouter.use(immunisationsRouter);
apiRouter.use(pregnancyRouter);
apiRouter.use(screeningsRouter);
apiRouter.use(consentRouter);
apiRouter.use(clinicianAdminRouter);
apiRouter.use(clinicianRouter);
