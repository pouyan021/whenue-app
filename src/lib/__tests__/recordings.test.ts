import { forgetRecording, recordingFor, keepRecording } from '../recordings';

// Where Expo Go keeps a recording: the folder name itself holds percent signs
const uri =
  'file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Fwhenue-app-fb52/Camera/ce52.mp4';

test('keeps the recording URI exactly, per visit token', () => {
  keepRecording('token-a', uri);
  expect(recordingFor('token-a')).toBe(uri);
  expect(recordingFor('token-b')).toBeUndefined();

  forgetRecording('token-a');
  expect(recordingFor('token-a')).toBeUndefined();
});
