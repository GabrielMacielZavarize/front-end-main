import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import client from '../api/client';
import { useLogin } from '../context/LoginProvider';
import { isValidEmail, isValidObjField, updateError } from '../utils/methods';
import FormContainer from './FormContainer';
import FormInput from './FormInput';
import FormSubmitButton from './FormSubmitButton';

const LoginForm = () => {
  const { setIsLoggedIn, setProfile } = useLogin();
  const [userInfo, setUserInfo] = useState({
    email: '',
    senha: '',
  });

  const [error, setError] = useState('');

  const { email, senha } = userInfo;

  const handleOnChangeText = (value, fieldName) => {
    setUserInfo({ ...userInfo, [fieldName]: value });
  };

  const isValidForm = () => {
    if (!isValidObjField(userInfo))
      return updateError('Preencha todos os campos.', setError);

    if (!isValidEmail(email)) return updateError('Email inválido.', setError);

    if (!senha.trim() || senha.length < 8)
      return updateError('Senha muito curta.', setError);

    return true;
  };

  const submitForm = async () => {
    if (isValidForm()) {
      try {
        const res = await client.post(`https://cima-production.up.railway.app/usuariologin`, userInfo);
    
        if (res.data.success && res.data.usuario) {
          const user = res.data.usuario;
  
          if (user.senha === userInfo.senha.trim()) {
            setUserInfo({ email: '', senha: '' });

            // Verifica se o usuário está na tabela usuario_temp
            const isTempUser = await checkTempUser(user.id);
            
            if (isTempUser) {
              // Usuário está aguardando aprovação
              updateError('Sua conta está aguardando aprovação', setError, 'blue');
            } else {
              // Usuário aprovado
              setProfile(user);
              setIsLoggedIn(true);
            }
          } else {
            updateError('Sua senha não condiz com seu email.', setError);
          }
        } else {
          updateError('Usuário não encontrado. Verifique seu email.', setError);
        }
      } catch (error) {
        console.error('Error:', error.message);
        updateError('Erro ao tentar fazer login. Tente novamente mais tarde.', setError);
      }
    }
  };

  // Função para verificar se o usuário está na tabela usuario_temp
  const checkTempUser = async (userId) => {
    try {
      const response = await client.get(`https://cima-production.up.railway.app/usuario_temp/${userId}`);
      return response.data.success;
    } catch (error) {
      console.error('Error ao verificar usuário temporário:', error.message);
      return false;
    }
  };

  return (
    <FormContainer>
      {error ? (
        <Text style={{ color: 'red', fontSize: 18, textAlign: 'center' }}>
          {error}
        </Text>
      ) : null}
      <FormInput
        value={email}
        onChangeText={value => handleOnChangeText(value, 'email')}
        label='Email'
        placeholder='Digite seu email...'
        autoCapitalize='none'
        placeholderTextColor="#A9A9A9"
      />
      <FormInput
        value={senha}
        onChangeText={value => handleOnChangeText(value, 'senha')}
        label='Senha'
        placeholder='Digite sua senha...'
        autoCapitalize='none'
        placeholderTextColor="#A9A9A9"
        secureTextEntry
      />
      <FormSubmitButton onPress={submitForm} title='Entrar' />
    </FormContainer>
  );
};

export default LoginForm;
