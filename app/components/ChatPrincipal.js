import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  Modal,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useLogin } from '../context/LoginProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';

function ChatPrincipal() {
  const { profile, userId, registerProfileImageCallback, updateProfileImage } = useLogin();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userName, setUserName] = useState('');

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://192.168.1.57:3000', {
      reconnection: true,
    });

    socketRef.current.on('chat message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
      saveMessageLocally(message);
    });

    loadSavedMessages();

    return () => {
      // Não desconecte o socket aqui
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() !== '') {
      const newMessage = {
        text: message,
        isUserMessage: true,
        userName: profile.nome,
        userId: `https://cima-production.up.railway.app/usuario/${userId}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      socketRef.current.emit('chat message', newMessage);
      setMessage('');
    }
  };
  const newMessage = {
    text: message,
    isUserMessage: true,
    userName: profile.nome,
    userId: `https://cima-production.up.railway.app/usuario/${userId}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    deleted: false, // Adicione este campo
  };
  const clearMessagesLocally = async () => {
    if (messages.length === 0) {
      Alert.alert('Sem mensagens para apagar.');
      return;
    }

    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza de que deseja apagar todas as mensagens permanentemente?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Apagar',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('chatMessages');
              setMessages([]);
            } catch (error) {
              console.error('Erro ao apagar mensagens localmente:', error);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const saveMessageLocally = async (message) => {
    try {
      const savedMessages = await AsyncStorage.getItem('chatMessages');
      const parsedMessages = savedMessages ? JSON.parse(savedMessages) : [];
      parsedMessages.push(message);
      await AsyncStorage.setItem('chatMessages', JSON.stringify(parsedMessages));
    } catch (error) {
      console.error('Erro ao salvar mensagem localmente:', error);
    }
  };

  const loadSavedMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('chatMessages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens salvas:', error);
    }
  };

  const isReceivedImage = (message) => {
    const currentUserIP = '10.32.1.116'; // IP do usuário atual
    return message.ip !== currentUserIP && message.isReceivedImage;
  };

  const handleLongPress = (message) => {
    setSelectedMessage(message);
    setModalVisible(true);
  };

  const handleDeleteMessage = async () => {
    if (selectedMessage && !selectedMessage.deleted) {
      try {
        const deleteMessage = {
          text: 'Esta mensagem foi excluída.',
          isUserMessage: true,
          userName: profile.nome,
          userId: `https://cima-production.up.railway.app/usuario/${userId}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          deleted: true,
        };
  
        // Enviar a mensagem especial indicando exclusão apenas para o usuário local
        socketRef.current.emit('chat message', deleteMessage);
  
        // Atualizar a lista local, marcando a mensagem como excluída apenas para o usuário local
        const updatedMessages = messages.map((msg) =>
          msg === selectedMessage && msg.userId === `https://cima-production.up.railway.app/usuario/${userId}`
            ? { ...msg, deleted: true }
            : msg
        );
  
        await AsyncStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
  
        setSelectedMessage(null);
        setModalVisible(false);
      } catch (error) {
        console.error('Erro ao excluir mensagem localmente:', error);
      }
    }
  };  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={clearMessagesLocally}>
            <Icon name="trash" size={24} color="black" style={styles.trashIcon} />
          </TouchableOpacity>
        </View>
        <FlatList
  style={styles.messageList}
  data={messages.filter((msg) => !msg.deleted)}
  keyExtractor={(item, index) => index.toString()}
  renderItem={({ item }) => (
    <TouchableOpacity
      onLongPress={() => handleLongPress(item)}
      style={[
        styles.messageContainer,
        item.userId === `https://cima-production.up.railway.app/usuario/${userId}`
          ? styles.userMessageContainer
          : styles.receiverMessageContainer,
        isReceivedImage(item) ? styles.receivedImageContainer : null,
      ]}
    >
              <Text style={styles.userNameText}>{item.userName}</Text>
              {isReceivedImage(item) ? (
                <Image source={{ uri: item.imageURL }} style={styles.receivedImage} />
              ) : (
                <Text style={styles.messageText}>{item.text}</Text>
              )}
              <Text style={styles.timestampText}>{item.timestamp}</Text>
            </TouchableOpacity>
  )}
        />
        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.actionButton} onPress={handleDeleteMessage}>
                <Text style={styles.actionButtonText}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.actionButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Digite sua mensagem"
            value={message}
            onChangeText={(text) => setMessage(text)}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

export default ChatPrincipal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 30,
    paddingHorizontal: 10,
  },
  trashIcon: {
    marginLeft: 'auto',
    marginTop: 20,
  },
  messageList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    minWidth: 100,
    alignSelf: 'flex-end',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#D1E1FC', // Cor de fundo para mensagens enviadas pelo usuário
  },
  userNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E3E5C',
    marginBottom: 4,
  },
  receiverMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE2D1', // Cor de fundo para mensagens recebidas
  },
  receivedImageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFEFEF',
  },
  receivedImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#1C3977',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 16,
    color: 'black',
  },
});