import {ChatsLayout} from '../components/layouts/Chats';
import {Link} from '../components/Link';
import {ChatlistItem} from '../components/chats/ChatlistItem';
import {ChatlistControls} from '../components/chats/ChatlistControls';
import {ChatboxMessage} from '../components/chats/ChatboxMessage';
import {ChatboxHeader} from '../components/chats/ChatboxHeader';
import {ChatboxFooter} from '../components/chats/ChatboxFooter';
import {ChatboxTextarea} from '../components/chats/ChatboxTextarea';
import {AddUserPopup as Popup} from '../components/chats/AddUserPopup';
import {JSONWrapper} from '../modules/Utils';

const view = new ChatsLayout({
  title: 'Чаты',
  user: 'Собеседник',
  Popup,
  Link, ChatlistItem, ChatlistControls,
  ChatboxMessage, ChatboxHeader, ChatboxFooter, ChatboxTextarea,
});

const chats = JSONWrapper.stringify([
  {
    user: 'Андрей',
    quote: 'Изображение',
    when: '10:49',
    unreads: 2,
    active: true,
  },
  {
    user: 'Илья',
    quote: 'Друзья, у меня для вас особенный выпуск новостей!...',
    when: '15:12',
    unreads: 4222,
  },
  {
    user: 'Design Destroyer',
    quote: 'В 2008 году художник Jon Rafman  начал собирать...',
    when: 'Пн', unreads: 0,
  },
]);

const longText = 'Привет! Смотри, тут всплыл интересный кусок лунной ' +
  'космической истории — НАСА в какой-то момент попросила Хассельблад ' +
  'адаптировать модель SWC для полетов на Луну. Сейчас мы все знаем что ' +
  'астронавты летали с моделью 500 EL — и к слову говоря, все тушки этих ' +
  'камер все еще находятся на поверхности Луны, так как астронавты с собой ' +
  'забрали только кассеты с пленкой.' +
  '\n\n' +
  'Хассельблад в итоге адаптировал SWC для космоса, но что-то пошло не так ' +
  'и на ракету они так никогда и не попали. Всего их было произведено 25 ' +
  'штук, одну из них недавно продали на аукционе за 45000 евро.';

const messages = JSONWrapper.stringify([
  {type: 'inc', when: '11:56', text: longText},
  {type: 'out', when: '12:00', status: 1, text: 'Круто!'},
]);

view.props.Chatlist = () => `
  %{ ChatlistControls }%
  <ul>
    %{ ChatlistItem(${chats}...) }%
  </ul>
`;

view.props.ProfileLink = new Link({
  url: 'profile.html',
  label: 'Профиль&ensp;<small>❯</small>',
});

view.props.ChatboxBody = () => `
  <div class="chatbox__date">19 июня (вс)</div>

  %{ ChatboxMessage(${messages}...) }%
`;

export {view};
