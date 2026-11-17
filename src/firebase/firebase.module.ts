import { Module, Logger } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { MockFirestoreService } from './mock-firestore.service';

export const FIRESTORE_SERVICE_TOKEN = 'FIRESTORE_SERVICE';

@Module({
  providers: [
    FirebaseService,
    MockFirestoreService,
    {
      provide: FIRESTORE_SERVICE_TOKEN,
      useFactory: (
        firebaseService: FirebaseService,
        mockService: MockFirestoreService,
      ) => {
        const logger = new Logger('FirebaseModule');
        const hasCredentials = Boolean(
          process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
          (process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY) ||
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          process.env.FIRESTORE_EMULATOR_HOST,
        );

        if (process.env.USE_MOCK_FIRESTORE === 'true' || !hasCredentials) {
          logger.log(
            'Using MockFirestoreService (In-Memory Firestore) for development/testing. Set valid Firebase credentials in .env to switch to real Firestore.',
          );
          return mockService;
        }

        logger.log('Using real FirebaseService connected to Firestore.');
        return firebaseService;
      },
      inject: [FirebaseService, MockFirestoreService],
    },
  ],
  exports: [FIRESTORE_SERVICE_TOKEN, FirebaseService, MockFirestoreService],
})
export class FirebaseModule {}
