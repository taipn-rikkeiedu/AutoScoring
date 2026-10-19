import { MessageRouter } from '~/src/background/messageRouter';
import { handleFetchMessage } from '~/src/background/fetchProxy';
import { FloatingWindowManager } from '~/src/background/floatingWindow';
import { QLDT_API_RECORD_MESSAGE, handleQldtApiRecord } from '~/src/background/qldtApiRecord';
import { FETCH_MESSAGE } from '~/src/infra/proxyProtocol';

export default defineBackground(() => {
  const floatingWindow = new FloatingWindowManager();
  floatingWindow.start();

  new MessageRouter()
    .register(FETCH_MESSAGE, handleFetchMessage)
    .register(QLDT_API_RECORD_MESSAGE, handleQldtApiRecord)
    .register('OPEN_FLOATING_WINDOW', () => floatingWindow.openOrFocus().then(() => ({ success: true })))
    .listen();
});
