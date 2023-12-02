import { mockReminders } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import { logDebug } from '../js/plugin/logger';
import { DateTime } from 'luxon';
import {
  getScheduledNotifs,
  updateScheduledNotifs,
  getReminderPrefs,
  setReminderPrefs,
} from '../js/splash/notifScheduler';

const exampleReminderSchemes = {
  weekly: {
    title: {
      en: 'Please take a moment to label your trips',
      es: 'Por favor, tómese un momento para etiquetar sus viajes',
    },
    text: {
      en: 'Click to open the app and view unlabeled trips',
      es: 'Haga clic para abrir la aplicación y ver los viajes sin etiquetar',
    },
    schedule: [
      { start: 0, end: 1, intervalInDays: 1 },
      { start: 3, end: 5, intervalInDays: 2 },
    ],
    defaultTime: '21:00',
  },
  'week-quarterly': {
    title: {
      en: 'Please take a moment to label your trips',
      es: 'Por favor, tómese un momento para etiquetar sus viajes',
    },
    text: {
      en: 'Click to open the app and view unlabeled trips',
      es: 'Haga clic para abrir la aplicación y ver los viajes sin etiquetar',
    },
    schedule: [
      { start: 0, end: 1, intervalInDays: 1 },
      { start: 3, end: 5, intervalInDays: 2 },
    ],
    defaultTime: '22:00',
  },
  passive: {
    title: {
      en: 'Please take a moment to label your trips',
      es: 'Por favor, tómese un momento para etiquetar sus viajes',
    },
    text: {
      en: 'Click to open the app and view unlabeled trips',
      es: 'Haga clic para abrir la aplicación y ver los viajes sin etiquetar',
    },
    schedule: [
      { start: 0, end: 1, intervalInDays: 1 },
      { start: 3, end: 5, intervalInDays: 2 },
    ],
    defaultTime: '23:00',
  },
};

mockLogger();
mockReminders();

jest.mock('../js/services/commHelper', () => ({
  ...jest.requireActual('../js/services/commHelper'),
  getUser: jest.fn(() =>
    Promise.resolve({
      // These values are **important**...
      //   reminder_assignment: must match a key from the reminder scheme above,
      //   reminder_join_date: must match the first day of the mocked notifs below in the tests,
      //   reminder_time_of_day: must match the defaultTime from the chosen reminder_assignment in the reminder scheme above
      reminder_assignment: 'weekly',
      reminder_join_date: '2023-11-14',
      reminder_time_of_day: '21:00',
    }),
  ),
  updateUser: jest.fn(() => Promise.resolve()),
}));

jest.mock('../js/plugin/clientStats', () => ({
  ...jest.requireActual('../js/plugin/clientStats'),
  addStatReading: jest.fn(),
}));

jest.mock('../js/plugin/logger', () => ({
  ...jest.requireActual('../js/plugin/logger'),
  logDebug: jest.fn(),
}));

jest.mock('../js/splash/notifScheduler', () => ({
  ...jest.requireActual('../js/splash/notifScheduler'),
  // for getScheduledNotifs
  getNotifs: jest.fn(),
  // for updateScheduledNotifs
  calcNotifTimes: jest.fn(),
  removeEmptyObjects: jest.fn(),
  areAlreadyScheduled: jest.fn(),
  scheduleNotifs: jest.fn(),
}));

describe('getScheduledNotifs', () => {
  it('should resolve with notifications while not actively scheduling', async () => {
    // getScheduledNotifs arguments
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin
    const mockNotifs = [{ trigger: { at: DateTime.now().toMillis() } }];
    // create the expected result
    const expectedResult = [
      {
        key: DateTime.fromMillis(mockNotifs[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifs[0].trigger.at).toFormat('t'),
      },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the function
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should resolve with notifications if actively scheduling', async () => {
    // getScheduledNotifs arguments
    const isScheduling = true;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin
    const mockNotifs = [{ trigger: { at: DateTime.now().toMillis() } }];
    // create the expected result
    const expectedResult = [
      {
        key: DateTime.fromMillis(mockNotifs[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifs[0].trigger.at).toFormat('t'),
      },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the funciton
    const scheduledNotifs = await getScheduledNotifs(isScheduling, scheduledPromise);

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should handle case where no notifications are present', async () => {
    // getScheduledNotifs arguments
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin
    const mockNotifs = [];
    // create the expected result
    const expectedResult = [];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the funciton
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should handle the case where greater than 5 notifications are present', async () => {
    // getScheduledNotifs arguments
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin (greater than 5 notifications)
    const mockNotifs = [
      { trigger: { at: DateTime.now().toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 1 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 2 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 3 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 4 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 5 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 6 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 7 }).toMillis() } },
    ];
    // create the expected result (only the first 5 notifications)
    const expectedResult = [
      {
        key: DateTime.fromMillis(mockNotifs[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifs[0].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifs[1].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifs[1].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifs[2].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifs[2].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifs[3].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifs[3].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifs[4].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifs[4].trigger.at).toFormat('t'),
      },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the funciton
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });
});

describe('updateScheduledNotifs', () => {
  afterEach(() => {
    jest.restoreAllMocks(); // Restore mocked functions after each test
  });

  it('should resolve after scheduling notifications', async () => {
    // updateScheduleNotifs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = false;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create an empty array of mock notifs from cordova plugin
    const mockNotifs = [];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'cancelAll')
      .mockImplementation((callback) => callback());
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'schedule')
      .mockImplementation((arg, callback) => callback(arg));
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(setIsScheduling).toHaveBeenCalledWith(true);
    expect(logDebug).toHaveBeenCalledWith('After cancelling, there are no scheduled notifications');
    expect(logDebug).toHaveBeenCalledWith('After scheduling, there are no scheduled notifications');
    expect(setIsScheduling).toHaveBeenCalledWith(false);
  });

  it('should resolve without scheduling if notifications are already scheduled', async () => {
    // updateScheduleNotifs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = false;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create the mock notifs from cordova plugin (must match the notifs that will generate from the reminder scheme above...
    // in this case: exampleReminderSchemes.weekly, because getUser is mocked to return reminder_assignment: 'weekly')
    const mockNotifs = [
      { trigger: { at: DateTime.fromFormat('2023-11-14 21:00', 'yyyy-MM-dd HH:mm').toMillis() } },
      { trigger: { at: DateTime.fromFormat('2023-11-15 21:00', 'yyyy-MM-dd HH:mm').toMillis() } },
      { trigger: { at: DateTime.fromFormat('2023-11-17 21:00', 'yyyy-MM-dd HH:mm').toMillis() } },
      { trigger: { at: DateTime.fromFormat('2023-11-19 21:00', 'yyyy-MM-dd HH:mm').toMillis() } },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(logDebug).toHaveBeenCalledWith('Already scheduled, not scheduling again');
  });

  it('should wait for the previous scheduling to finish if isScheduling is true', async () => {
    // updateScheduleNotifs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = true;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create an empty array of mock notifs from cordova plugin
    const mockNotifs = [];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(logDebug).toHaveBeenCalledWith(
      'ERROR: Already scheduling notifications, not scheduling again',
    );
  });

  it('should log an error message if the reminder scheme is missing', async () => {
    // updateScheduleNotifs arguments
    let reminderSchemes: any = exampleReminderSchemes;
    delete reminderSchemes.weekly; // delete the weekly reminder scheme, to create a missing reminder scheme error
    let isScheduling: boolean = false;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(logDebug).toHaveBeenCalledWith('Error: Reminder scheme not found');
  });
});

describe('getReminderPrefs', () => {
  it('should resolve with reminder prefs when user exists', async () => {
    // getReminderPrefs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = true;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create the expected result
    const expectedResult = {
      reminder_assignment: 'weekly',
      reminder_join_date: '2023-11-14',
      reminder_time_of_day: '21:00',
    };

    // call the function
    const { reminder_assignment, reminder_join_date, reminder_time_of_day } =
      await getReminderPrefs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(reminder_assignment).toEqual(expectedResult.reminder_assignment);
    expect(reminder_join_date).toEqual(expectedResult.reminder_join_date);
    expect(reminder_time_of_day).toEqual(expectedResult.reminder_time_of_day);
  });
});
